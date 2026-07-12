import type { ChatStreamEvent } from "@karakeep/trpc/routers/chat/contracts";

export interface Message {
  id: string;
  role: "user" | "assistant" | "toolResult";
  content: string;
  toolCalls?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }[];
  toolResult?: {
    toolCallId: string;
    toolName: string;
    isError: boolean;
    error?: string;
  };
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  modifiedAt: Date | null;
}

export interface StreamingAssistantMessage {
  id: "streaming-assistant";
  role: "assistant";
  content: string;
  toolCalls?: Message["toolCalls"];
}

export interface ToolStatus {
  status: "running" | "done" | "error";
  error?: string;
}

/** The ephemeral state produced by the active message stream. */
export interface StreamState {
  chatId: string | null;
  messages: Message[];
  streamingMessage: StreamingAssistantMessage | null;
  toolStatuses: Map<string, ToolStatus>;
}

export const initialStreamState: StreamState = {
  chatId: null,
  messages: [],
  streamingMessage: null,
  toolStatuses: new Map(),
};

export type StreamAction =
  | { type: "streamStarted"; chatId: string | null }
  | { type: "streamEnded" }
  | { type: "streamEvent"; event: ChatStreamEvent };

export function streamReducer(
  state: StreamState,
  action: StreamAction,
): StreamState {
  switch (action.type) {
    case "streamStarted":
      return {
        chatId: action.chatId,
        messages: [],
        toolStatuses: new Map(),
        streamingMessage: null,
      };
    case "streamEnded":
      return { ...state, streamingMessage: null };
    case "streamEvent":
      return reduceStreamEvent(state, action.event);
  }
}

/**
 * Folds a single ChatStreamEvent into the conversation state. `cache_invalidation`
 * has no effect here: it drives a query-cache side effect handled by the caller.
 */
export function reduceStreamEvent(
  state: StreamState,
  event: ChatStreamEvent,
): StreamState {
  switch (event.type) {
    case "chat":
      return { ...state, chatId: event.chat.id };
    case "tool_execution_start": {
      const toolStatuses = new Map(state.toolStatuses);
      toolStatuses.set(event.toolCall.id, { status: "running" });
      return { ...state, toolStatuses };
    }
    case "tool_execution_end": {
      const toolStatuses = new Map(state.toolStatuses);
      toolStatuses.set(event.toolCall.id, {
        status: event.toolCall.isError ? "error" : "done",
        error: event.toolCall.error,
      });
      return { ...state, toolStatuses };
    }
    case "message_update":
      return {
        ...state,
        streamingMessage: {
          id: "streaming-assistant",
          role: "assistant",
          content: event.message.content,
          toolCalls: event.message.toolCalls,
        },
      };
    case "message": {
      const alreadyPresent = state.messages.some(
        (message) => message.id === event.message.id,
      );
      return {
        ...state,
        messages: alreadyPresent
          ? state.messages
          : [...state.messages, event.message],
        // The persisted assistant message replaces the live streaming preview.
        streamingMessage:
          event.message.role === "assistant" ? null : state.streamingMessage,
      };
    }
    case "cache_invalidation":
      return state;
    default:
      return state;
  }
}

export function mergeMessages(
  history: Message[],
  stream: StreamState,
  activeChatId: string | null,
): Message[] {
  if (stream.chatId === null || stream.chatId !== activeChatId) {
    return history;
  }

  const seen = new Set(history.map((message) => message.id));
  return [
    ...history,
    ...stream.messages.filter((message) => !seen.has(message.id)),
  ];
}

/**
 * Resolves the status badge for each tool call: persisted tool results win over
 * the live in-flight statuses so a reloaded chat still shows done/error marks.
 */
export function getToolStatuses(
  messages: Message[],
  activeToolStatuses: Map<string, ToolStatus>,
) {
  const statuses = new Map(activeToolStatuses);
  for (const message of messages) {
    if (message.role !== "toolResult" || !message.toolResult) {
      continue;
    }
    statuses.set(message.toolResult.toolCallId, {
      status: message.toolResult.isError ? "error" : "done",
      error: message.toolResult.error,
    });
  }
  return statuses;
}
