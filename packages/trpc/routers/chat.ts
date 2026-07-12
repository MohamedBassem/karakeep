import { TRPCError } from "@trpc/server";
import { z } from "zod";

import serverConfig from "@karakeep/shared/config";
import { authedProcedure, router } from "../index";
import { ChatRepo } from "../models/chat.repo";
import { chatMessageSchema, chatSessionSchema } from "./chat/contracts";
import type { ChatStreamEvent } from "./chat/contracts";
import {
  parseDbChatMessages,
  parseDbChatSession,
  requireChatSession,
  toPublicChatSession,
  toPublicMessage,
} from "./chat/messages";
import { streamChatMessage } from "./chat/stream";

function requireMutationResult<T>(value: T | null, message: string): T {
  if (!value) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }

  return value;
}

const chatProcedure = authedProcedure.use((opts) => {
  if (!serverConfig.chat.enabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Chat is disabled.",
    });
  }

  return opts.next();
});

export const chatAppRouter = router({
  list: chatProcedure
    .output(z.array(chatSessionSchema))
    .query(async ({ ctx }) => {
      const repo = new ChatRepo(ctx.db);
      const chats = (await repo.listSessions(ctx.user.id)).map(
        parseDbChatSession,
      );
      return chats.map(toPublicChatSession);
    }),

  create: chatProcedure
    .input(
      z
        .object({
          title: z.string().trim().min(1).optional(),
        })
        .optional(),
    )
    .output(chatSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const repo = new ChatRepo(ctx.db);
      return toPublicChatSession(
        parseDbChatSession(
          requireMutationResult(
            await repo.createSession({
              userId: ctx.user.id,
              title: input?.title ?? "New chat",
              createdAt: new Date(),
              modifiedAt: new Date(),
            }),
            "Failed to create chat",
          ),
        ),
      );
    }),

  history: chatProcedure
    .input(
      z.object({
        chatId: z.string(),
      }),
    )
    .output(z.array(chatMessageSchema))
    .query(async ({ ctx, input }) => {
      const repo = new ChatRepo(ctx.db);
      const chat = requireChatSession(
        await repo.getSessionForUser(ctx.user.id, input.chatId),
      );
      const messages = parseDbChatMessages(await repo.listMessages(chat.id));
      return messages.map(toPublicMessage);
    }),

  clear: chatProcedure
    .input(
      z.object({
        chatId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const repo = new ChatRepo(ctx.db);
      await repo.deleteSessionForUser(ctx.user.id, input.chatId);
    }),

  clearAll: chatProcedure.mutation(async ({ ctx }) => {
    const repo = new ChatRepo(ctx.db);
    await repo.deleteAllSessionsForUser(ctx.user.id);
  }),

  message: chatProcedure
    .input(
      z.object({
        chatId: z.string().optional(),
        message: z.string().trim().min(1),
      }),
    )
    .subscription(async function* (opts): AsyncGenerator<ChatStreamEvent> {
      yield* streamChatMessage(opts.ctx, opts.input);
    }),
});
