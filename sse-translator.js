export class SseTranslator {
  constructor(res, model) {
    this.res = res;
    this.model = model;
    this.responseId = "resp_" + Math.random().toString(36).slice(2, 10);
    this.itemId = "item_" + Math.random().toString(36).slice(2, 10);
    this.textStarted = false;
    this.textOutputIndex = -1;
    this.contentSoFar = "";
    this.toolCalls = new Map();
    this.started = false;
    this._finished = false;
    this.outputIndex = 0;
  }

  emit(event, data) {
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  _ensureStarted() {
    if (this.started) return;
    this.started = true;
    this.emit("response.created", {
      type: "response.created",
      response: {
        id: this.responseId,
        object: "response",
        status: "in_progress",
        model: this.model,
        output: [],
      },
    });
    this.emit("response.in_progress", {
      type: "response.in_progress",
      response_id: this.responseId,
    });
  }

  feedTextDelta(text) {
    this._ensureStarted();
    this.contentSoFar += text;
    if (!this.textStarted) {
      this.textStarted = true;
      this.textOutputIndex = this.outputIndex;
      this.emit("response.output_item.added", {
        type: "response.output_item.added",
        response_id: this.responseId,
        output_index: this.textOutputIndex,
        item: {
          id: this.itemId,
          type: "message",
          role: "assistant",
          status: "in_progress",
          content: [],
        },
      });
    }
    this.emit("response.output_text.delta", {
      type: "response.output_text.delta",
      response_id: this.responseId,
      item_id: this.itemId,
      output_index: this.textOutputIndex,
      content_index: 0,
      delta: text,
    });
  }

  startToolCall(streamKey, callId, name) {
    this._ensureStarted();
    const idx = this.outputIndex++;
    const call = { id: callId, name, arguments: "", outputIndex: idx };
    this.toolCalls.set(streamKey, call);
    this.emit("response.output_item.added", {
      type: "response.output_item.added",
      response_id: this.responseId,
      output_index: idx,
      item: {
        id: `fc_${callId}`,
        type: "function_call",
        call_id: callId,
        name,
        status: "in_progress",
      },
    });
    return idx;
  }

  feedToolCallDelta(streamKey, delta) {
    const call = this.toolCalls.get(streamKey);
    if (!call) return;
    call.arguments += delta;
    this.emit("response.function_call_arguments.delta", {
      type: "response.function_call_arguments.delta",
      response_id: this.responseId,
      item_id: `fc_${call.id}`,
      output_index: call.outputIndex,
      delta,
    });
  }

  done(usage) {
    if (this._finished) return;
    this._finished = true;
    this._ensureStarted();
    const output = [];

    if (this.textStarted) {
      this.emit("response.output_text.done", {
        type: "response.output_text.done",
        response_id: this.responseId,
        item_id: this.itemId,
        output_index: this.textOutputIndex,
        content_index: 0,
        text: this.contentSoFar,
      });
      this.emit("response.output_item.done", {
        type: "response.output_item.done",
        response_id: this.responseId,
        output_index: this.textOutputIndex,
        item: {
          id: this.itemId,
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: this.contentSoFar }],
          status: "completed",
        },
      });
      output.push({
        id: this.itemId,
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: this.contentSoFar }],
        status: "completed",
      });
    }

    for (const [streamKey, call] of this.toolCalls) {
      this.emit("response.function_call_arguments.done", {
        type: "response.function_call_arguments.done",
        response_id: this.responseId,
        item_id: `fc_${call.id}`,
        output_index: call.outputIndex,
        arguments: call.arguments,
        name: call.name,
        call_id: call.id,
      });
      this.emit("response.output_item.done", {
        type: "response.output_item.done",
        response_id: this.responseId,
        output_index: call.outputIndex,
        item: {
          id: `fc_${call.id}`,
          type: "function_call",
          call_id: call.id,
          name: call.name,
          arguments: call.arguments,
          status: "completed",
        },
      });
      output.push({
        id: `fc_${call.id}`,
        type: "function_call",
        call_id: call.id,
        name: call.name,
        arguments: call.arguments,
        status: "completed",
      });
    }

    this.emit("response.completed", {
      type: "response.completed",
      response: {
        id: this.responseId,
        object: "response",
        status: "completed",
        model: this.model,
        usage: usage || null,
        output,
      },
    });
    this.res.end();
  }

  error(msg) {
    this.emit("error", { type: "error", code: "proxy_error", message: msg });
    try { this.res.end(); } catch (_) {}
  }

  end() {
    try { this.res.end(); } catch (_) {}
  }
}
