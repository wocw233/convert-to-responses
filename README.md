# Convert to responses

> 多厂商 AI API 转译代理网关 — 让仅支持 OpenAI Responses API 的客户端透明使用其他 AI 服务商。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 概述

**Convert to responses** 是一个轻量级的 API 转译代理服务器。它接收标准的 OpenAI Responses API 格式请求（`/v1/responses`），自动将其翻译为对应 AI 服务商的原生 API 格式，并将上游响应转译回 OpenAI Responses API 格式返回给客户端。

主要应用场景：让 **Codex CLI / 桌面端** 能够使用 DeepSeek、Anthropic Claude、OpenAI Chat 等不支持 Responses API 格式的服务商。

```
客户端 (Codex)                    Convert to responses                  上游 API
─────────                        ────────────────────                  ────────
POST /v1/responses  ──────────>  翻译为厂商原生格式  ──────────────>  DeepSeek
  (OpenAI Responses 格式)                                          Anthropic
                                                                   OpenAI Chat
<── OpenAI Responses 格式  <────  转译回 Responses 格式  <──────   OpenAI Responses
```

## 功能特性

- **多厂商适配** — 支持 DeepSeek、Anthropic、OpenAI Chat、OpenAI Responses 四种后端
- **完整 SSE 流式支持** — 实时流式转译，支持文本输出和工具调用（function_call）增量推送
- **Web 管理面板** — 可视化界面管理服务商配置，支持中/英文双语切换
- **一键切换** — 随时激活不同服务商，请求自动路由到当前活动的后端
- **连接测试** — 内置服务商连通性测试，快速验证 API Key 和接口地址
- **实时日志** — 终端日志通过 SSE 推送到管理面板，支持级别过滤
- **零配置启动** — SQLite 自动建表，所有配置通过 Web 面板完成
- **轻量高效** — 无重型依赖，express + better-sqlite3 为核心的极简架构

## 支持的服务商

| 服务商 | API 类型 | 默认接口 |
|--------|---------|---------|
| DeepSeek | Chat Completions | `https://api.deepseek.com` |
| Anthropic | Messages | `https://api.anthropic.com` |
| OpenAI Chat | Chat Completions | `https://api.openai.com` |
| OpenAI Responses | Responses（直通） | `https://api.openai.com` |

## 快速开始

### 环境要求

- Node.js >= 18

### 安装

```bash
git clone https://github.com/wocw233/convert-to-responses.git
cd convert-to-responses
npm install
```

### 启动

```bash
npm start        # 生产模式
npm run dev      # 开发模式（文件变更自动重启）
```

Windows 用户也可直接双击运行 `start.bat`。

服务启动后访问 **http://127.0.0.1:11435** 打开管理面板。

### 配置服务商

1. 点击「添加服务商」
2. 填写名称、选择 API 类型、填入 API Key 和接口地址
3. 选择需要使用的模型
4. 点击「激活」设为当前路由目标

### 使用

将客户端的 API 地址指向本服务：

```
Base URL: http://127.0.0.1:11435
API Path: /v1/responses
```

## API 端点

### 代理端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/v1/responses` | 主代理端点，接受 OpenAI Responses API 格式请求 |
| `POST` | `/responses` | `/v1/responses` 的别名 |
| `GET` | `/v1` | 服务信息 |
| `GET` | `/health` | 健康检查 |

可通过 HTTP 头部 `x-provider-id` 指定特定服务商 ID，覆盖默认路由。

### 管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/providers` | 列出所有服务商 |
| `POST` | `/api/providers` | 创建服务商 |
| `PUT` | `/api/providers/:id` | 更新服务商 |
| `DELETE` | `/api/providers/:id` | 删除服务商 |
| `POST` | `/api/providers/:id/activate` | 激活服务商 |
| `POST` | `/api/providers/:id/test` | 测试连接 |
| `GET` | `/api/status` | 系统状态 |
| `GET` | `/api/logs/recent` | 最近日志 |
| `GET` | `/api/logs/stream` | SSE 实时日志流 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `11435` | 服务端口 |
| `HOST` | `127.0.0.1` | 绑定地址 |

## 项目结构

```
apiswitch/
├── server.js              # 主服务入口
├── db.js                  # SQLite 数据库层
├── sse-translator.js      # SSE 流式转译器
├── providers/             # 服务商适配器
│   ├── chat-base.js       # Chat Completions 通用翻译
│   ├── deepseek.js        # DeepSeek 适配
│   ├── anthropic.js       # Anthropic 适配
│   ├── openai-chat.js     # OpenAI Chat 适配
│   └── openai-responses.js # OpenAI Responses 直通
├── public/                # Web 管理面板
│   ├── index.html         # 面板页面
│   ├── app.js             # 前端逻辑
│   ├── lang.js            # 国际化
│   └── style.css          # 样式
├── start.bat              # Windows 启动脚本
└── package.json
```

## 许可证

MIT
