export function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p.type === "input_text" || p.type === "output_text" || p.type === "text" || p.type === "reasoning_text")
    .map((p) => p.text ?? "")
    .join("");
}

export function buildUrl(baseUrl, path) {
  return new URL(baseUrl.replace(/\/$/, "") + path);
}

export function sendError(res, statusCode, message) {
  if (!res.headersSent) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message } }));
  }
}

export function translateMessages(input) {
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
        const m = { role: "assistant", tool_calls: [] };
        messages.push(m);
        return m;
      })();
      if (!target.tool_calls) target.tool_calls = [];
      target.tool_calls.push({
        id: item.call_id || item.id,
        type: "function",
        function: { name: item.name, arguments: item.arguments },
      });
    } else if (item.type === "function_call_output") {
      messages.push({
        role: "tool",
        tool_call_id: item.call_id || item.id,
        content: extractText(item.output),
      });
    } else if (item.role) {
      const role = item.role === "developer" ? "system" : item.role;
      const msg = { role, content: extractText(item.content) };
      if (item.tool_calls) msg.tool_calls = item.tool_calls;
      if (item.tool_call_id) msg.tool_call_id = item.tool_call_id;
      messages.push(msg);
    }
  }
  return messages;
}

export function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return extractText(messages[i].content);
  }
  return "";
}

export function translateTools(rawTools) {
  if (!Array.isArray(rawTools)) return [];
  return rawTools
    .map((t) => {
      const name = t.name ?? t.function?.name;
      if (!name) return null;
      return {
        type: "function",
        function: {
          name,
          description: t.description ?? t.function?.description ?? "",
          parameters: t.parameters ?? t.function?.parameters ?? { type: "object", properties: {} },
        },
      };
    })
    .filter(Boolean);
}
