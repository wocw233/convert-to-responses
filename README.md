# Convert to responses

> Multi-provider AI API translation gateway — let Codex use Anthropic, OpenAI Chat, and more.

> 多厂商 AI API 转译网关 — 让 Codex 用上 Anthropic、OpenAI Chat 等任意后端。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What is this / 这是什么

A lightweight proxy that receives OpenAI Responses API requests and translates them to the upstream provider's native format — then translates the response back. **Transparent to the client.**

一个轻量代理，接收 OpenAI Responses API 格式的请求，自动翻译为上游服务商的原生格式，再将响应转译回来。**全程透明，客户端无感知。**

```
Codex → (Responses API) → convert-to-responses → (native API) → Anthropic / OpenAI Chat / OpenAI Responses
```

## Quick Start / 快速开始

**Requirements / 环境**：Node.js ≥ 18

```bash
git clone https://github.com/wocw233/convert-to-responses.git
cd convert-to-responses
npm install
npm start
```

Open **http://127.0.0.1:11435** for the management panel. / 启动后访问管理面板。

### Add a provider / 添加服务商

1. Click **Add Provider** → choose API type → fill in API Key, endpoint URL, and model / 点击「添加服务商」→ 选择 API 类型 → 填入 API Key、接口地址和模型
2. Click **Activate** to set it as the active backend / 点击「激活」将该服务商设为当前后端
3. Use **Test Connection** to verify / 可用「测试连接」验证配置是否正确

### Connect your client / 接入客户端

Point your client's API endpoint to / 将客户端 API 地址设为：

```
http://127.0.0.1:11435/v1/responses
```

## Using with Codex / 配合 Codex 使用

Codex doesn't natively support custom API endpoints — use **CCSwitch** to inject one. / Codex 原生不支持切换 API 端点，需借助 **CCSwitch** 注入。

**CCSwitch config / 配置**：Set API address to / API 地址填写 `http://127.0.0.1:11435/v1`. API Key and model name can be **anything** — real configuration is done through the management panel. / API Key 和模型名称**随意填写即可**——真正的 Key 和模型切换都在管理面板中完成。

## Supported providers / 支持的服务商

| Provider / 服务商 | API type / API 类型 | Default endpoint / 默认接口 |
|---|---|---|
| Anthropic | Messages | `https://api.anthropic.com` |
| OpenAI Chat | Chat Completions | `https://api.openai.com` |
| OpenAI Responses | Responses (passthrough / 直通) | `https://api.openai.com` |

## Features / 功能

- **Format translation / 格式转译** — Responses ↔ Chat Completions / Messages, with SSE streaming and function_call support
- **Web panel / Web 面板** — visual provider management, bilingual UI (EN/ZH), real-time log viewer
- **One-click routing / 一键切换** — activate a provider to route all traffic; override via `x-provider-id` header
- **Zero config / 零配置** — SQLite auto-migration, no config files to edit

## Environment variables / 环境变量

| Variable / 变量 | Default / 默认值 | Description / 说明 |
|---|---|---|
| `PORT` | `11435` | Server port / 服务端口 |
| `HOST` | `127.0.0.1` | Bind address / 绑定地址 |

## API reference / API 参考

### Proxy (for client use) / 代理（供客户端调用）

| Method | Path | Description / 说明 |
|---|---|---|
| `POST` | `/v1/responses` | Main proxy endpoint / 主代理端点 |
| `GET` | `/health` | Health check / 健康检查 |

### Management (for panel use) / 管理（供面板调用）

`/api/providers` — CRUD, activate, connectivity test / 服务商 CRUD、激活、连通测试  
`/api/logs/stream` — SSE real-time logs / SSE 实时日志  
`/api/status` — System status / 系统状态

## Project structure / 项目结构

```
├── server.js              # entry point / 入口
├── db.js                  # SQLite
├── sse-translator.js      # SSE translator / SSE 转译
├── providers/             # adapters / 适配器
│   ├── chat-base.js
│   ├── anthropic.js
│   ├── openai-chat.js
│   └── openai-responses.js
└── public/                # management panel / 管理面板
```

## License / 许可证

MIT
