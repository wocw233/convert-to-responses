# Convert to responses

> 多厂商 AI API 转译网关 — 让 Codex 用上 Anthropic、OpenAI Chat 等任意后端。

[ [EN](./README.en.md) ]

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 这是什么

一个轻量代理，接收 OpenAI Responses API 格式的请求，自动翻译为上游服务商的原生格式，再将响应转译回来。**全程透明，客户端无感知。**

```
Codex → (Responses API) → 本服务 → (原生 API) → Anthropic / OpenAI Chat / OpenAI Responses
```

## 快速开始

**环境**：Node.js ≥ 18

```bash
git clone https://github.com/wocw233/convert-to-responses.git
cd convert-to-responses
npm install
npm start
```

启动后访问 **http://127.0.0.1:11435** 打开管理面板。

### 添加服务商

1. 点击「添加服务商」→ 选择 API 类型 → 填入 API Key、接口地址和模型
2. 点击「激活」将该服务商设为当前后端
3. 可用「测试连接」验证配置是否正确

### 接入客户端

将客户端 API 地址设为：

```
http://127.0.0.1:11435/v1/responses
```

## 配合 Codex 使用

Codex 原生不支持切换 API 端点，需借助 **CCSwitch** 注入。

**CCSwitch 配置**：API 地址填写 `http://127.0.0.1:11435/v1`，API Key 和模型名称**随意填写即可**——真正的 Key 和模型切换都在管理面板中完成。

## 支持的服务商

| 服务商 | API 类型 | 默认接口 |
|---|---|---|
| Anthropic | Messages | `https://api.anthropic.com` |
| OpenAI Chat | Chat Completions | `https://api.openai.com` |
| OpenAI Responses | Responses（直通） | `https://api.openai.com` |

## 功能

- **格式转译** — Responses ↔ Chat Completions / Messages，含 SSE 流式与 function_call
- **Web 面板** — 可视化管理服务商，支持中/英切换，实时日志查看
- **一键切换** — 激活即路由，也可通过 `x-provider-id` 头部指定服务商
- **零配置** — SQLite 自动建表，无需手动编辑配置文件

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `11435` | 服务端口 |
| `HOST` | `127.0.0.1` | 绑定地址 |

## API 参考

### 代理（供客户端调用）

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/v1/responses` | 主代理端点 |
| `GET` | `/health` | 健康检查 |

### 管理（供面板调用）

`/api/providers` — 服务商 CRUD、激活、连通测试  
`/api/logs/stream` — SSE 实时日志  
`/api/status` — 系统状态

## 项目结构

```
├── server.js              # 入口
├── db.js                  # SQLite
├── sse-translator.js      # SSE 转译
├── providers/             # 适配器
│   ├── chat-base.js
│   ├── anthropic.js
│   ├── openai-chat.js
│   └── openai-responses.js
└── public/                # 管理面板
```

## 许可证

MIT
