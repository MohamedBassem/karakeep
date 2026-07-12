import type { Agent } from "@mariozechner/pi-agent-core";
import type { Usage } from "@mariozechner/pi-ai";

import type {
  ChatStreamEvent,
  PendingPersistedAgentMessage,
} from "./contracts";
import { toolUpdateDetailsSchema } from "./contracts";
import {
  getAgentMessageText,
  getToolResultText,
  toPersistedAgentMessage,
} from "./messages";

/**
 * Stream events used only while a chat turn is running. The public
 * ChatStreamEvent carries everything the client sees; these extra variants
 * drive the server-side turn loop (persist a finished message, end the turn,
 * surface a model/tool error) and are consumed before reaching the client.
 */
export type InternalChatStreamEvent =
  | Exclude<ChatStreamEvent, { type: "chat" } | { type: "message" }>
  | {
      type: "message_end";
      message: PendingPersistedAgentMessage;
    }
  | {
      type: "agent_end";
    }
  | {
      type: "agent_error";
      error: unknown;
    };

type AgentEvent = Parameters<Parameters<Agent["subscribe"]>[0]>[0];

/**
 * The result of translating a single pi-agent event into the chat turn's own
 * vocabulary. `usageDelta` and `startedToolCall` are returned as deltas so the
 * caller owns the running totals; this keeps the translation a pure function of
 * its input event, so the turn's event handling can be tested by feeding a
 * sequence of agent events without a live model or database.
 */
export interface TranslatedAgentEvent {
  streamEvents: InternalChatStreamEvent[];
  usageDelta: Usage | null;
  startedToolCall: boolean;
}

const NO_OP: TranslatedAgentEvent = {
  streamEvents: [],
  usageDelta: null,
  startedToolCall: false,
};

export function translateAgentEvent(event: AgentEvent): TranslatedAgentEvent {
  if (event.type === "message_update") {
    if (event.message.role !== "assistant") {
      return NO_OP;
    }
    const content = getAgentMessageText(event.message);
    const toolCalls = event.message.content
      .filter((item) => item.type === "toolCall")
      .map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments,
      }));
    return {
      streamEvents: [
        {
          type: "message_update",
          message: {
            role: "assistant",
            content,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          },
        },
      ],
      usageDelta: null,
      startedToolCall: false,
    };
  }

  if (event.type === "message_end") {
    // Usage is only reported on assistant turns.
    const usageDelta =
      event.message.role === "assistant" ? event.message.usage : null;

    // A failed/aborted turn is delivered as a normal message_end with an error
    // stop reason rather than a thrown error. Surface it instead of persisting
    // the broken turn and logging the run as a success.
    if (
      event.message.role === "assistant" &&
      (event.message.stopReason === "error" ||
        event.message.stopReason === "aborted")
    ) {
      return {
        streamEvents: [
          {
            type: "agent_error",
            error: new Error(
              event.message.errorMessage ?? "Chat model run failed",
            ),
          },
        ],
        usageDelta,
        startedToolCall: false,
      };
    }

    const persistedMessage = toPersistedAgentMessage(event.message);
    return {
      streamEvents: persistedMessage
        ? [{ type: "message_end", message: persistedMessage }]
        : [],
      usageDelta,
      startedToolCall: false,
    };
  }

  if (event.type === "tool_execution_start") {
    return {
      streamEvents: [
        {
          type: "tool_execution_start",
          toolCall: {
            id: event.toolCallId,
            name: event.toolName,
          },
        },
      ],
      usageDelta: null,
      startedToolCall: true,
    };
  }

  if (event.type === "tool_execution_end") {
    const error = event.isError ? getToolResultText(event.result) : undefined;
    return {
      streamEvents: [
        {
          type: "tool_execution_end",
          toolCall: {
            id: event.toolCallId,
            name: event.toolName,
            isError: event.isError,
            error,
          },
        },
      ],
      usageDelta: null,
      startedToolCall: false,
    };
  }

  if (event.type === "tool_execution_update") {
    const result = toolUpdateDetailsSchema.safeParse(
      event.partialResult.details,
    );
    const trpcHandles = result.success
      ? result.data.cacheInvalidation?.trpcHandles
      : undefined;
    return {
      streamEvents:
        trpcHandles && trpcHandles.length > 0
          ? [{ type: "cache_invalidation", trpcHandles }]
          : [],
      usageDelta: null,
      startedToolCall: false,
    };
  }

  if (event.type === "agent_end") {
    return {
      streamEvents: [{ type: "agent_end" }],
      usageDelta: null,
      startedToolCall: false,
    };
  }

  return NO_OP;
}
