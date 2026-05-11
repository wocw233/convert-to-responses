import https from "node:https";
import http from "node:http";
import { SseTranslator } from "../sse-translator.js";
import { extractText, lastUserText, buildUrl, sendError } from "./shared.js";

function translateInputToMessages(input) {
  const messages = [];
  
  if (!Array.isArray(input)) {
    if (typeof input === "string" && input.trim()) {
      messages.push({ role: "user", content: input });
    } else if (typeof input === "object" && input !== null) {
      const text = extractText(input.content);
      if (text) messages.push({ role: "user", content: text });
    }
    return messages;
  }

  for (const item of input) {
    if (item.type === "function_call") {
      const last = messages[messages.length - 1];
      const target = last && last.role === "assistant" ? last : (() => {
        const m = { role: "assistant", content: [] };
        messages.push(m);
        return m;
      })();
      if (!Array.isArray(target.content)) target.content = [];
      target.content.push({
        type: "tool_use",
        id: item.call_id || item.id,
        name: item.name,
        input: (() => { try { return JSON.parse(item.arguments); } catch { return {}; } })(),
      });
    } else if (item.type === "function_call_output") {
      messages.push({
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: item.call_id || item.id,
          content: extractText(item.output),
        }],
      });
    } else if (item.role) {
      const role = item.role === "developer" ? "user" : item.role;
      if (role === "system") continue;
      const content = extractText(item.content);
      if (content) {
        const msg = { role: role === "assistant" ? "assistant" : "user", content };
        messages.push(msg);
      }
    }
  }

  return messages;
}

function translateToolsForAnthropic(rawTools) {
  if (!Array.isArray(rawTools)) return [];
  return rawTools.map((t) => {
    const name = t.name ?? t.function?.name;
    if (!name) return null;
    return {
      name,
      description: t.description ?? t.function?.description ?? "",
      input_schema: t.parameters ?? t.function?.parameters ?? t.input_schema ?? { type: "object", properties: {} },
    };
  }).filter(Boolean);
}

export async function handleAnthropic(body, provider, res) {
  const apiKey = provider.api_key;
  const baseUrl = provider.base_url || "https://api.anthropic.com";
  const model = provider.model || "claude-3-sonnet-20240229";
  const stream = body.stream !== false;

  const messages = translateInputToMessages(body.input);
  const system = body.instructions ? String(body.instructions) : undefined;

  const reqBody = {
    model,
    messages,
    stream,
    max_tokens: body.max_output_tokens || 32768,
  };

  if (system) {
    reqBody.system = system;
  }

  const tools = translateToolsForAnthropic(body.tools);
  if (tools.length > 0) {
    reqBody.tools = tools;
  }

  console.log("[Anthropic] 输入:", lastUserText(messages)?.slice(0, 500));

  const fullUrl = buildUrl(baseUrl, "/v1/messages");
  const isHttps = fullUrl.protocol === "https:";
  const transport = isHttps ? https : http;

  const options = {
    hostname: fullUrl.hostname,
    port: fullUrl.port || (isHttps ? 443 : 80),
    path: fullUrl.pathname + fullUrl.search,
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "Accept": stream ? "text/event-stream" : "application/json",
    },
  };

  const antReq = transport.request(options, (antRes) => {
    antReq.setTimeout(120000, () => {
      antReq.destroy();
      sendError(res, 504, "上游请求超时");
    });
    if (antRes.statusCode !== 200) {
      let errBody = "";
      antRes.on("data", (c) => errBody += c);
      antRes.on("end", () => {
        console.error("[Anthropic 错误]", antRes.statusCode, errBody.slice(0, 300));
        sendError(res, 502, `Anthropic ${antRes.statusCode}: ${errBody.slice(0, 200)}`);
      });
      return;
    }

    if (!stream) {
      let data = "";
      antRes.on("data", (c) => data += c);
      antRes.on("end", () => {
        try {
          const msg = JSON.parse(data);
          const output = [];
          let textContent = "";
          for (const block of msg.content || []) {
            if (block.type === "text") {
              textContent += block.text;
            } else if (block.type === "tool_use") {
              output.push({
                id: `fc_${block.id}`,
                type: "function_call",
                call_id: block.id,
                name: block.name,
                arguments: JSON.stringify(block.input),
                status: "completed",
              });
            }
          }
          if (textContent) {
            console.log("[Anthropic] 输出:", textContent.slice(0, 500));
            output.unshift({ id: "msg_1", type: "message", role: "assistant", content: [{ type: "output_text", text: textContent }], status: "completed" });
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            id: msg.id || "resp_1",
            object: "response",
            status: "completed",
            model,
            usage: msg.usage ? {
              input_tokens: msg.usage.input_tokens,
              output_tokens: msg.usage.output_tokens,
              total_tokens: (msg.usage.input_tokens || 0) + (msg.usage.output_tokens || 0),
            } : null,
            output,
          }));
        } catch (e) {
          console.error("[Anthropic 解析错误]", e.message);
          sendError(res, 502, e.message);
        }
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const translator = new SseTranslator(res, model);
    let buffer = "";
    let lastUsage = null;

    antRes.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;
        try {
          const event = JSON.parse(json);
          switch (event.type) {
            case "content_block_start": {
              const block = event.content_block;
              if (block.type === "tool_use") {
                translator.startToolCall(event.index, block.id, block.name);
              }
              break;
            }
            case "content_block_delta": {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                translator.feedTextDelta(delta.text);
              } else if (delta.type === "input_json_delta") {
                translator.feedToolCallDelta(event.index, delta.partial_json);
              }
              break;
            }
            case "message_delta": {
              if (event.usage) {
                lastUsage = {
                  input_tokens: event.usage.input_tokens || 0,
                  output_tokens: event.usage.output_tokens || 0,
                  total_tokens: (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0),
                };
              }
              break;
            }
            case "message_stop": {
              translator.done(lastUsage);
              break;
            }
          }
        } catch (_) {}
      }
    });
    antRes.on("end", () => {
      translator.done(null);
    });
    antRes.on("error", (e) => {
      console.error("[Anthropic SSE错误]", e.message);
      translator.error(e.message);
    });
  });

  antReq.on("error", (e) => {
    console.error("[Anthropic 请求错误]", e.message);
    sendError(res, 502, e.message);
  });
  antReq.write(JSON.stringify(reqBody));
  antReq.end();
}