import https from "node:https";
import http from "node:http";
import { SseTranslator } from "../sse-translator.js";
import { translateMessages, lastUserText, translateTools, buildUrl, sendError } from "./shared.js";

export async function handleChatCompletions(config) {
  const { provider, body, res } = config;
  const apiKey = provider.api_key;
  const baseUrl = config.baseUrl || "https://api.openai.com";
  const model = config.model || "gpt-3.5-turbo";
  const stream = body.stream !== false;
  const label = config.label || "Chat";
  const identity = config.identity || "";
  const extraBody = config.extraBody || {};

  const messages = translateMessages(body.input);

  if (identity) {
    const instructions = body.instructions ? body.instructions + "\n\n" + identity : identity.trim();
    messages.unshift({ role: "system", content: instructions });
  } else if (body.instructions) {
    messages.unshift({ role: "system", content: body.instructions });
  }

  const chatBody = {
    model,
    messages,
    stream,
    ...extraBody,
  };

  const tools = translateTools(body.tools);
  if (tools.length > 0) {
    chatBody.tools = tools;
    chatBody.tool_choice = body.tool_choice ?? "auto";
  }
  if (body.max_output_tokens) chatBody.max_tokens = body.max_output_tokens;

  console.log(`[${label}] 输入:`, lastUserText(messages)?.slice(0, 500));

  const url = buildUrl(baseUrl, "/v1/chat/completions");
  const isHttps = url.protocol === "https:";
  const transport = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": stream ? "text/event-stream" : "application/json",
    },
  };

  const upstreamReq = transport.request(options, (upstreamRes) => {
    upstreamReq.setTimeout(120000, () => {
      upstreamReq.destroy();
      sendError(res, 504, "上游请求超时");
    });

    if (upstreamRes.statusCode !== 200) {
      let errBody = "";
      upstreamRes.on("data", (c) => errBody += c);
      upstreamRes.on("end", () => {
        console.error(`[${label} 错误]`, upstreamRes.statusCode, errBody.slice(0, 300));
        sendError(res, 502, `${label} ${upstreamRes.statusCode}: ${errBody.slice(0, 200)}`);
      });
      return;
    }

    if (!stream) {
      let data = "";
      upstreamRes.on("data", (c) => data += c);
      upstreamRes.on("end", () => {
        try {
          const completion = JSON.parse(data);
          const msg = completion.choices?.[0]?.message;
          const output = [];
          if (msg?.content) {
            console.log(`[${label}] 输出:`, msg.content.slice(0, 500));
            output.push({ id: "msg_1", type: "message", role: "assistant", content: [{ type: "output_text", text: msg.content }], status: "completed" });
          }
          if (msg?.tool_calls) {
            for (const tc of msg.tool_calls) {
              output.push({ id: `fc_${tc.id}`, type: "function_call", call_id: tc.id, name: tc.function.name, arguments: tc.function.arguments, status: "completed" });
            }
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            id: completion.id || "resp_" + Math.random().toString(36).slice(2, 10),
            object: "response",
            status: "completed",
            model,
            usage: completion.usage ? {
              input_tokens: completion.usage.prompt_tokens,
              output_tokens: completion.usage.completion_tokens,
              total_tokens: completion.usage.total_tokens,
            } : null,
            output,
          }));
        } catch (e) {
          console.error(`[${label} 解析错误]`, e.message);
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
    upstreamRes.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          translator.done(null);
          return;
        }
        try {
          const chunk = JSON.parse(json);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;
          if (delta.content) translator.feedTextDelta(delta.content);
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!translator.toolCalls.has(idx)) {
                translator.startToolCall(idx, tc.id || `call_${idx}`, tc.function?.name ?? "");
              }
              if (tc.function?.arguments) {
                translator.feedToolCallDelta(idx, tc.function.arguments);
              }
            }
          }
        } catch (_) {}
      }
    });
    upstreamRes.on("end", () => {
      if (buffer.trim()) {
        const json = buffer.split("\n").find(l => l.startsWith("data: "))?.slice(6).trim();
        if (json && json !== "[DONE]") {
          try {
            const chunk = JSON.parse(json);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) translator.feedTextDelta(delta.content);
          } catch (_) {}
        }
      }
      translator.done(null);
    });
    upstreamRes.on("error", (e) => {
      console.error(`[${label} SSE错误]`, e.message);
      translator.error(e.message);
    });
  });

  upstreamReq.on("error", (e) => {
    console.error(`[${label} 请求错误]`, e.message);
    sendError(res, 502, e.message);
  });
  upstreamReq.write(JSON.stringify(chatBody));
  upstreamReq.end();
}
