import { Agent } from "@mariozechner/pi-agent-core";
import { TRPCError } from "@trpc/server";

import { logEvent } from "@karakeep/shared-server";
import type { AuthedContext } from "../../index";
import { ChatRepo } from "../../models/chat.repo";
import { translateAgentEvent } from "./agentEvents";
import type { InternalChatStreamEvent } from "./agentEvents";
import { createAsyncQueue } from "./asyncQueue";
import type { ChatStreamEvent } from "./contracts";
import { addUsage, chatModel, emptyUsage, getChatApiKey } from "./model";
import {
  parseDbChatMessage,
  parseDbChatMessages,
  parseDbChatSession,
  requireChatSession,
  sanitizeAgentMessagesForReplay,
  toAgentMessage,
  toChatTRPCError,
  toPublicChatSession,
  toPublicMessage,
} from "./messages";
import { createChatTools } from "./tools";

interface ChatMessageInput {
  chatId?: string;
  message: string;
}

function getChatTitle(message: string) {
  return message.slice(0, 80);
}

function requireMutationResult<T>(value: T | null, message: string): T {
  if (!value) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }

  return value;
}

export async function* streamChatMessage(
  ctx: AuthedContext,
  input: ChatMessageInput,
): AsyncGenerator<ChatStreamEvent> {
  const repo = new ChatRepo(ctx.db);
  let nextCreatedAt = Date.now();
  const getNextCreatedAt = () => new Date(nextCreatedAt++);
  const modifiedAt = getNextCreatedAt();

  const chat = input.chatId
    ? parseDbChatSession(
        requireMutationResult(
          await repo.updateSessionModifiedAt(
            requireChatSession(
              await repo.getSessionForUser(ctx.user.id, input.chatId),
            ).id,
            modifiedAt,
          ),
          "Failed to update chat",
        ),
      )
    : parseDbChatSession(
        requireMutationResult(
          await repo.createSession({
            userId: ctx.user.id,
            title: getChatTitle(input.message),
            createdAt: modifiedAt,
            modifiedAt,
          }),
          "Failed to create chat",
        ),
      );

  yield { type: "chat", chat: toPublicChatSession(chat) };

  const parsedUserMessage = parseDbChatMessage(
    requireMutationResult(
      await repo.createUserMessage({
        chatId: chat.id,
        content: input.message,
        createdAt: getNextCreatedAt(),
      }),
      "Failed to create chat message",
    ),
  );

  yield { type: "message", message: toPublicMessage(parsedUserMessage) };

  const persistedMessages = parseDbChatMessages(
    await repo.listMessages(chat.id),
  );
  const previousMessages = persistedMessages.filter(
    (message) => message.id !== parsedUserMessage.id,
  );

  const agent = new Agent({
    initialState: {
      systemPrompt:
        "You are a helpful assistant. Use the available tools when you need information about the user's saved bookmarks or when the user asks you to organize, update, or delete their saved data.",
      model: chatModel,
      tools: createChatTools(ctx),
      messages: sanitizeAgentMessagesForReplay(
        previousMessages.map(toAgentMessage),
      ),
    },
    getApiKey: getChatApiKey,
  });

  const events = createAsyncQueue<InternalChatStreamEvent>();
  let chatUsage = emptyUsage;
  let toolCallCount = 0;

  agent.subscribe((event) => {
    const translated = translateAgentEvent(event);
    if (translated.usageDelta) {
      chatUsage = addUsage(chatUsage, translated.usageDelta);
    }
    if (translated.startedToolCall) {
      toolCallCount += 1;
    }
    for (const streamEvent of translated.streamEvents) {
      events.push(streamEvent);
    }
  });

  let promptError: unknown;
  const promptPromise = agent.prompt(input.message).catch((error) => {
    promptError = error;
    events.push({ type: "agent_error", error });
    events.close();
  });

  try {
    for await (const value of events) {
      if (value.type === "agent_error") {
        throw toChatTRPCError(value.error);
      }

      if (value.type === "agent_end") {
        break;
      }

      if (
        value.type === "message_update" ||
        value.type === "tool_execution_start" ||
        value.type === "tool_execution_end" ||
        value.type === "cache_invalidation"
      ) {
        yield value;
        continue;
      }

      const createdMessage = await repo.createAgentMessage({
        chatId: chat.id,
        role: value.message.role,
        content: value.message.content,
        metadata: value.message.metadata,
        createdAt: getNextCreatedAt(),
      });
      if (!createdMessage) {
        // The chat may have been deleted while the turn was still streaming.
        // Stop gracefully (the finally block aborts the agent) instead of
        // surfacing an INTERNAL_SERVER_ERROR for an expected race.
        if (!(await repo.getSessionForUser(ctx.user.id, chat.id))) {
          return;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chat message",
        });
      }
      const parsedAssistantMessage = parseDbChatMessage(createdMessage);

      yield {
        type: "message",
        message: toPublicMessage(parsedAssistantMessage),
      };

      const updatedSession = await repo.updateSessionModifiedAt(
        chat.id,
        getNextCreatedAt(),
      );
      if (!updatedSession) {
        if (!(await repo.getSessionForUser(ctx.user.id, chat.id))) {
          return;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update chat",
        });
      }

      yield {
        type: "chat",
        chat: toPublicChatSession(parseDbChatSession(updatedSession)),
      };
    }

    await promptPromise;
    if (promptError) {
      throw toChatTRPCError(promptError);
    }
    logEvent({
      "event.name": "chat.message",
      "user.id": ctx.user.id,
      "chat.id": chat.id,
      "chat.model": chatModel.id,
      "chat.provider": chatModel.provider,
      "chat.input_tokens": chatUsage.input,
      "chat.output_tokens": chatUsage.output,
      "chat.cache_read_tokens": chatUsage.cacheRead,
      "chat.cache_write_tokens": chatUsage.cacheWrite,
      "chat.total_tokens": chatUsage.totalTokens,
      "chat.cost": chatUsage.cost.total,
      "chat.tool_calls": toolCallCount,
    });
  } finally {
    // On client disconnect tRPC calls generator.return(), which runs only this
    // finally block. Abort the agent so it stops calling the model and stops
    // executing (possibly destructive) tools once nobody is consuming the stream.
    agent.abort();
    events.close();
  }
}
