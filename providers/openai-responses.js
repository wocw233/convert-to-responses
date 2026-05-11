import https from "node:https";
import http from "node:http";
import { buildUrl, sendError } from "./shared.js";

export async function handleOpenAIResponses(body, provider, res) {
  const apiKey = provider.api_key;
  const baseUrl = provider.base_url || "https://api.openai.com";
  const model = provider.model || "gpt-4o";
  const stream = body.stream !== false;

  const proxyBody = {
    ...body,
    model,
    stream,
  };

  if (!proxyBody.model || proxyBody.model === "auto") {
    proxyBody.model = model;
  }

  console.log("[OpenAI Responses] 输入模型:", proxyBody.model, "流式:", stream);

  const url = buildUrl(baseUrl, "/v1/responses");
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

  const oaiReq = transport.request(options, (oaiRes) => {
    oaiReq.setTimeout(120000, () => {
      oaiReq.destroy();
      sendError(res, 504, "上游请求超时");
    });
    if (oaiRes.statusCode !== 200) {
      let errBody = "";
      oaiRes.on("data", (c) => errBody += c);
      oaiRes.on("end", () => {
        console.error("[OpenAI Responses 错误]", oaiRes.statusCode, errBody.slice(0, 300));
        sendError(res, 502, errBody || `OpenAI ${oaiRes.statusCode}`);
      });
      return;
    }

    if (stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
    }

    oaiRes.pipe(res);
  });

  oaiReq.on("error", (e) => {
    console.error("[OpenAI Responses 请求错误]", e.message);
    sendError(res, 502, e.message);
  });
  oaiReq.write(JSON.stringify(proxyBody));
  oaiReq.end();
}
