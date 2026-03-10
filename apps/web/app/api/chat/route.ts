import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import serverConfig from "@karakeep/shared/config";

import {
  createContextFromRequest,
  createTrcpClientFromCtx,
} from "@/server/api/client";

import { getTools } from "./tools";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful bookmark assistant for Karakeep. You help users find, organize, and manage their bookmarks, tags, and lists.

Guidelines:
- Be concise and helpful.
- When searching, show results rather than asking clarifying questions.
- When showing bookmarks, include their titles and URLs when available.
- Always confirm with the user before deleting anything.
- Format responses in markdown.
- When a user asks to find something, use searchBookmarks first. If search is unavailable, fall back to getBookmarks.
- You can chain multiple tool calls to accomplish complex tasks (e.g., search for bookmarks, then tag them).`;

export async function POST(req: Request) {
  const ctx = await createContextFromRequest(req);
  if (!ctx.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!serverConfig.inference.openAIApiKey) {
    return new Response("AI inference is not configured", { status: 503 });
  }

  const { messages } = await req.json();

  const api = createTrcpClientFromCtx(() => ctx);

  const provider = createOpenAI({
    apiKey: serverConfig.inference.openAIApiKey,
    baseURL: serverConfig.inference.openAIBaseUrl,
  });

  const result = streamText({
    model: provider(serverConfig.inference.textModel),
    system: SYSTEM_PROMPT,
    messages,
    tools: getTools(api),
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
