# Convert to responses

> Multi-provider AI API translation gateway — let Codex use Anthropic, OpenAI Chat, and more.

[ [中文](./README.md) ]

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What is this

A lightweight proxy that receives OpenAI Responses API requests and translates them to the upstream provider's native format — then translates the response back. **Transparent to the client.**

```
Codex → (Responses API) → convert-to-responses → (native API) → Anthropic / OpenAI Chat / OpenAI Responses
```

## Quick Start

**Requirements**: Node.js ≥ 18

```bash
git clone https://github.com/wocw233/convert-to-responses.git
cd convert-to-responses
npm install
npm start
```

Open **http://127.0.0.1:11435** for the management panel.

### Add a provider

1. Click **Add Provider** → choose API type → fill in API Key, endpoint URL, and model
2. Click **Activate** to set it as the active backend
3. Use **Test Connection** to verify

### Connect your client

Point your client's API endpoint to:

```
http://127.0.0.1:11435/v1/responses
```

## Using with Codex

Codex doesn't natively support custom API endpoints — use **CCSwitch** to inject one.

**CCSwitch config**: Set API address to `http://127.0.0.1:11435/v1`. API Key and model name can be **anything** — real configuration is done through the management panel.

## Supported providers

| Provider | API type | Default endpoint |
|---|---|---|
| Anthropic | Messages | `https://api.anthropic.com` |
| OpenAI Chat | Chat Completions | `https://api.openai.com` |
| OpenAI Responses | Responses (passthrough) | `https://api.openai.com` |

## Features

- **Format translation** — Responses ↔ Chat Completions / Messages, with SSE streaming and function_call support
- **Web panel** — visual provider management, bilingual UI, real-time log viewer
- **One-click routing** — activate a provider to route all traffic; override via `x-provider-id` header
- **Zero config** — SQLite auto-migration, no config files to edit

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `11435` | Server port |
| `HOST` | `127.0.0.1` | Bind address |

## API reference

### Proxy (for client use)

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/responses` | Main proxy endpoint |
| `GET` | `/health` | Health check |

### Management (for panel use)

`/api/providers` — CRUD, activate, connectivity test  
`/api/logs/stream` — SSE real-time logs  
`/api/status` — System status

## Project structure

```
├── server.js              # entry point
├── db.js                  # SQLite
├── sse-translator.js      # SSE translator
├── providers/             # adapters
│   ├── chat-base.js
│   ├── anthropic.js
│   ├── openai-chat.js
│   └── openai-responses.js
└── public/                # management panel
```

## License

MIT
