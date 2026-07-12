import { describe, expect, it } from "vitest";

import type { Message, StreamState } from "./conversationState";
import {
  getToolStatuses,
  initialStreamState,
  mergeMessages,
  streamReducer,
} from "./conversationState";

function message(id: string, role: Message["role"] = "assistant"): Message {
  return {
    id,
    role,
    content: id,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("streamReducer", () => {
  it("deduplicates persisted messages by id", () => {
    const event = { type: "message", message: message("message-1") } as const;
    const once = streamReducer(initialStreamState, {
      type: "streamEvent",
      event,
    });
    const twice = streamReducer(once, { type: "streamEvent", event });

    expect(twice.messages).toEqual([event.message]);
  });

  it("resets all stream state when a stream starts", () => {
    const state: StreamState = {
      chatId: "old-chat",
      messages: [message("message-1")],
      streamingMessage: {
        id: "streaming-assistant",
        role: "assistant",
        content: "draft response",
      },
      toolStatuses: new Map([["tool-1", { status: "running" }]]),
    };

    const result = streamReducer(state, {
      type: "streamStarted",
      chatId: "new-chat",
    });

    expect(result).toEqual({
      chatId: "new-chat",
      messages: [],
      streamingMessage: null,
      toolStatuses: new Map(),
    });
  });

  it("tracks tool execution status transitions", () => {
    const running = streamReducer(initialStreamState, {
      type: "streamEvent",
      event: {
        type: "tool_execution_start",
        toolCall: { id: "tool-1", name: "search" },
      },
    });
    const done = streamReducer(running, {
      type: "streamEvent",
      event: {
        type: "tool_execution_end",
        toolCall: {
          id: "tool-1",
          name: "search",
          isError: true,
          error: "failed",
        },
      },
    });

    expect(running.toolStatuses.get("tool-1")).toEqual({ status: "running" });
    expect(done.toolStatuses.get("tool-1")).toEqual({
      status: "error",
      error: "failed",
    });
  });
});

describe("mergeMessages", () => {
  const stream: StreamState = {
    chatId: "chat-1",
    messages: [message("shared"), message("stream-only")],
    streamingMessage: null,
    toolStatuses: new Map(),
  };

  it("ignores a stream belonging to another chat", () => {
    const history = [message("history")];
    expect(mergeMessages(history, stream, "chat-2")).toBe(history);
  });

  it("keeps history order and appends unseen stream messages", () => {
    const history = [message("history"), message("shared")];
    expect(
      mergeMessages(history, stream, "chat-1").map(({ id }) => id),
    ).toEqual(["history", "shared", "stream-only"]);
  });
});

describe("getToolStatuses", () => {
  it("lets persisted tool results override live status", () => {
    const toolResult: Message = {
      ...message("result", "toolResult"),
      toolResult: {
        toolCallId: "tool-1",
        toolName: "search",
        isError: false,
      },
    };

    const statuses = getToolStatuses(
      [toolResult],
      new Map([["tool-1", { status: "running" }]]),
    );

    expect(statuses.get("tool-1")).toEqual({
      status: "done",
      error: undefined,
    });
  });
});
