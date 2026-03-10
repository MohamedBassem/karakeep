import { createOpenAI } from "@ai-sdk/openai";
import type { Message } from "ai";
import { streamText } from "ai";

import serverConfig from "@karakeep/shared/config";

import {
  createContextFromRequest,
  createTrcpClientFromCtx,
} from "@/server/api/client";

import { getTools } from "./tools";

export const maxDuration = 600;

const SYSTEM_PROMPT = `You are a helpful bookmark assistant for Karakeep. You help users find, organize, and manage their bookmarks, tags, and lists.

Guidelines:
- Be concise and helpful.
- When searching, show results rather than asking clarifying questions.
- When showing bookmarks, format them nicely. Display the title as a clickable markdown link (e.g., [Title](url)) when a URL is available, otherwise just the title. Only include the summary or note if it adds value to the response. Never dump raw bookmark data or IDs to the user.
- Always confirm with the user before deleting anything.
- Format responses in markdown.
- When a user asks to find something, use searchBookmarks first. If search is unavailable, fall back to getBookmarks. Be proactive: try multiple searches in parallel with different keywords, synonyms, or qualifiers to maximize the chance of finding what the user is looking for. For example, if a user asks for "that article about cooking", search for "cooking", "recipe", and "food" in parallel. If initial results aren't satisfactory, try additional searches with alternative terms.
- You can chain multiple tool calls to accomplish complex tasks (e.g., search for bookmarks, then tag them). You can also call multiple tools in parallel when the calls are independent of each other.`;

/**
 * Filter out messages that contain tool invocations without results.
 * This prevents AI_MessageConversionError when the client resends messages
 * from a previous stream that was interrupted mid-tool-call.
 */
function sanitizeMessages(messages: Message[]): Message[] {
  return messages.filter((message) => {
    if (message.role !== "assistant") return true;
    if (!message.toolInvocations) return true;
    const hasIncompleteToolCall = message.toolInvocations.some(
      (invocation) => invocation.state !== "result",
    );
    return !hasIncompleteToolCall;
  });
}

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
    messages: sanitizeMessages(messages),
    tools: getTools(api),
    maxSteps: 50,
  });

  return result.toDataStreamResponse();
}
