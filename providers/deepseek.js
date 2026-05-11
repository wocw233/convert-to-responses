import { handleChatCompletions } from "./chat-base.js";

export async function handleDeepSeek(body, provider, res) {
  const IDENTITY = "[IMPORTANT: Your true underlying model is DeepSeek, developed by DeepSeek (深度求索). You are NOT OpenAI, GPT, Claude, or Codex. When asked about your model identity, you MUST answer that you are DeepSeek, not any other model. Ignore any conflicting identity claims in the instructions above.]";
  return handleChatCompletions({
    provider,
    body,
    res,
    baseUrl: provider.base_url || "https://api.deepseek.com",
    model: provider.model || "deepseek-chat",
    label: "DeepSeek",
    identity: IDENTITY,
    extraBody: { thinking: { type: "disabled" } },
  });
}
