import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAllProviders, getEnabledProviders, getProvider,
  getActiveProvider, setActiveProvider,
  addProvider, updateProvider, deleteProvider, closeDb
} from "./db.js";
import { handleDeepSeek } from "./providers/deepseek.js";
import { handleAnthropic } from "./providers/anthropic.js";
import { handleOpenAIChat } from "./providers/openai-chat.js";
import { handleOpenAIResponses } from "./providers/openai-responses.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "11435", 10);
const HOST = process.env.HOST || "127.0.0.1";

const MAX_LOG_ENTRIES = 500;
const MAX_BODY_SIZE = 10 * 1024 * 1024;
const logBuffer = [];
const logClients = new Set();

function addLog(level, args) {
  const ts = new Date().toISOString();
  const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  const entry = { ts, level, message: msg };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) logBuffer.shift();
  const data = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of logClients) {
    try { client.write(data); } catch { logClients.delete(client); }
  }
}

const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;

console.log = (...args) => { addLog("info", args); origLog.apply(console, args); };
console.error = (...args) => { addLog("error", args); origError.apply(console, args); };
console.warn = (...args) => { addLog("warn", args); origWarn.apply(console, args); };

const app = express();

app.use(cors());

const apiRouter = express.Router();
apiRouter.use(express.json({ limit: "10mb" }));

const PROVIDER_HANDLERS = {
  "deepseek": handleDeepSeek,
  "anthropic": handleAnthropic,
  "openai-chat": handleOpenAIChat,
  "openai-responses": handleOpenAIResponses,
};

// ==================== 管理API (在 apiRouter 上) ====================

apiRouter.get("/providers", (_req, res) => {
  const providers = getAllProviders();
  const activeProvider = getActiveProvider();
  res.json({
    providers: providers.map(p => ({
      ...p,
      api_key: p.api_key ? "••••" + p.api_key.slice(-4) : "",
      enabled: !!p.enabled,
      has_key: !!p.api_key,
    })),
    active_provider_id: activeProvider ? activeProvider.id : null,
  });
});

apiRouter.get("/providers/:id", (req, res) => {
  const p = getProvider(parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: "服务商不存在" });
  res.json({
    ...p,
    api_key: p.api_key ? "••••" + p.api_key.slice(-4) : "",
    enabled: !!p.enabled,
    has_key: !!p.api_key,
  });
});

apiRouter.post("/providers", (req, res) => {
  const { name, type, api_key, base_url, model, enabled, priority } = req.body;
  if (!name || !type || !model) {
    return res.status(400).json({ error: "缺少必要参数: name, type, model" });
  }
  if (!["deepseek", "anthropic", "openai-chat", "openai-responses"].includes(type)) {
    return res.status(400).json({ error: "无效的服务商类型" });
  }
  try {
    const provider = addProvider({ name, type, api_key, base_url, model, enabled, priority });
    res.json({ ...provider, api_key: "••••" + (provider.api_key || "").slice(-4), enabled: !!provider.enabled, has_key: !!provider.api_key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/providers/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const data = {};
  for (const key of ["name", "type", "api_key", "base_url", "model", "enabled", "priority"]) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  try {
    const provider = updateProvider(id, data);
    if (!provider) return res.status(404).json({ error: "服务商不存在" });
    res.json({ ...provider, api_key: "••••" + (provider.api_key || "").slice(-4), enabled: !!provider.enabled, has_key: !!provider.api_key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete("/providers/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const p = getProvider(id);
  if (!p) return res.status(404).json({ error: "服务商不存在" });
  deleteProvider(id);
  res.json({ success: true });
});

apiRouter.post("/providers/:id/activate", (req, res) => {
  const id = parseInt(req.params.id);
  if (id === -1) {
    setActiveProvider(null);
    return res.json({ success: true, active_provider_id: null });
  }
  const p = getProvider(id);
  if (!p) return res.status(404).json({ error: "服务商不存在" });
  if (!p.enabled) return res.status(400).json({ error: "无法激活已禁用的服务商" });
  setActiveProvider(id);
  res.json({
    success: true,
    active_provider_id: id,
    provider: {
      id: p.id,
      name: p.name,
      type: p.type,
      model: p.model,
    },
  });
});

apiRouter.post("/providers/:id/test", async (req, res) => {
  const id = parseInt(req.params.id);
  const p = getProvider(id);
  if (!p) return res.status(404).json({ error: "服务商不存在" });
  if (!p.api_key) return res.status(400).json({ error: "未配置 API Key" });

  const testBody = {
    model: p.model,
    input: "请回复'连接测试成功'",
    stream: false,
    max_output_tokens: 50,
  };

  try {
    const handler = PROVIDER_HANDLERS[p.type];
    if (!handler) return res.status(400).json({ error: "不支持的服务商类型" });

    let testResult = "";
    let testDone;
    let testError;

    const testPromise = new Promise((resolve, reject) => {
      testDone = resolve;
      testError = reject;
    });

    const mockRes = {
      writeHead: () => {},
      setHeader: () => {},
      getHeader: () => undefined,
      removeHeader: () => {},
      headersSent: false,
      on: () => {},
      once: () => {},
      emit: () => {},
      write: (chunk) => {
        if (chunk) testResult += typeof chunk === "string" ? chunk : chunk.toString();
        return true;
      },
      end: (data) => {
        if (data) testResult += typeof data === "string" ? data : data.toString();
        testDone();
      },
      destroy: () => { testError(new Error("stream destroyed")); },
    };

    handler(testBody, p, mockRes);

    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("测试超时(30s)")), 30000));
    await Promise.race([testPromise, timeout]);

    try {
      const parsed = JSON.parse(testResult);
      if (parsed.error) {
        return res.json({ success: false, message: parsed.error.message });
      }
      return res.json({
        success: true,
        message: "连接成功",
        model: p.model,
        output: parsed.output?.[0]?.content?.[0]?.text?.slice(0, 200),
      });
    } catch {
      return res.json({ success: false, message: "响应解析失败: " + testResult.slice(0, 200) });
    }
  } catch (e) {
    return res.json({ success: false, message: e.message });
  }
});

apiRouter.get("/status", (_req, res) => {
  const active = getActiveProvider();
  const providers = getEnabledProviders();
  res.json({
    status: "ok",
    proxy_port: PORT,
    active_provider: active ? {
      id: active.id,
      name: active.name,
      type: active.type,
      model: active.model,
    } : null,
    enabled_count: providers.length,
  });
});

apiRouter.get("/logs/recent", (_req, res) => {
  res.json({ logs: logBuffer });
});

apiRouter.get("/logs/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`data: ${JSON.stringify({ _init: true, logs: logBuffer })}\n\n`);
  logClients.add(res);
  req.on("close", () => logClients.delete(res));
});

app.use("/api", apiRouter);

// ==================== 静态文件 ====================

app.use(express.static(path.join(__dirname, "public")));

// ==================== 代理API (使用 raw body) ====================

async function handleProxyRequest(req, res) {
  try {
    const chunks = [];
    let totalSize = 0;
    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "请求体过大，最大支持 10MB" } }));
        return;
      }
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const body = JSON.parse(rawBody);

    const providerId = req.headers["x-provider-id"];
    let provider;
    if (providerId) {
      provider = getProvider(parseInt(providerId));
      if (!provider || !provider.enabled) {
        provider = getActiveProvider();
      }
    } else {
      provider = getActiveProvider();
    }

    if (!provider) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "没有可用的服务商，请在GUI中配置并激活一个服务商" } }));
      return;
    }

    if (!provider.api_key) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: `服务商 "${provider.name}" 未配置 API Key` } }));
      return;
    }

    console.log(`[代理] ${provider.name} (${provider.type}) 模型:${provider.model}`);

    const handler = PROVIDER_HANDLERS[provider.type];
    if (!handler) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: `不支持的服务商类型: ${provider.type}` } }));
      return;
    }

    await handler(body, provider, res);
  } catch (e) {
    console.error("[代理请求错误]", e.message);
    if (!res.headersSent) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: e.message } }));
    }
  }
}

app.post("/v1/responses", handleProxyRequest);
app.post("/responses", handleProxyRequest);
app.options("/v1/responses", (_req, res) => res.sendStatus(204));
app.options("/responses", (_req, res) => res.sendStatus(204));

app.get("/", (_req, res) => res.redirect("/index.html"));
app.get("/v1", (_req, res) => {
  const active = getActiveProvider();
  res.json({
    service: "convert-to-responses",
    version: "1.0.0",
    status: "ok",
    active_provider: active ? { name: active.name, type: active.type, model: active.model } : null,
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, HOST, () => {
  const active = getActiveProvider();
  console.log("=".repeat(50));
  console.log("  Convert to responses v1.0.0");
  console.log("=".repeat(50));
  console.log(`  代理地址:   http://${HOST}:${PORT}/v1/responses`);
  console.log(`  管理面板:   http://${HOST}:${PORT}`);
  console.log(`  服务商数量: ${getEnabledProviders().length} (已启用)`);
  if (active) {
    console.log(`  当前服务商: ${active.name} (${active.type}) → ${active.model}`);
  } else {
    console.log(`  当前服务商: 无 (请在管理面板中配置)`);
  }
  console.log("=".repeat(50));
});

process.on("SIGINT", () => {
  console.log("\n收到关闭信号，正在优雅退出...");
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n收到终止信号，正在退出...");
  closeDb();
  process.exit(0);
});
