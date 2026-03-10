# AI Bookmark Assistant - Implementation Plan

## Overview

Add a floating chat panel (like ChatGPT widget) to the Karakeep dashboard. Users interact with an AI assistant that can search, create, edit, delete bookmarks, manage tags, and manage lists. Uses Vercel AI SDK for streaming. No chat persistence (ephemeral sessions). OpenAI-compatible provider only.

---

## 1. Dependencies

Install in the web app (`apps/web`):
```
pnpm add ai @ai-sdk/openai
```

- `ai` - Vercel AI SDK core (provides `streamText`, `useChat`, tool definitions)
- `@ai-sdk/openai` - OpenAI-compatible provider (works with any OpenAI-compatible API including proxied Ollama)

---

## 2. File Structure

```
apps/web/
  app/api/chat/
    route.ts                    # POST route handler for streaming chat
  app/api/chat/
    tools.ts                    # Tool definitions for the AI assistant
  components/chat/
    AIChatPanel.tsx             # Main floating chat panel component
    AIChatToggle.tsx            # Floating toggle button (bottom-right)
    ChatMessage.tsx             # Individual message rendering
    ChatToolInvocation.tsx      # Renders tool call results inline

packages/shared/
  config.ts                     # Add INFERENCE_CHAT_MODEL config (or reuse INFERENCE_TEXT_MODEL)
```

---

## 3. Server Side: Route Handler

### `apps/web/app/api/chat/route.ts`

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { createContextFromRequest } from "@/server/api/client";
import { createTrcpClientFromCtx } from "@/server/api/client";
import { getTools } from "./tools";
import { serverConfig } from "@karakeep/shared/config";

export const maxDuration = 60; // Allow longer streaming responses

export async function POST(req: Request) {
  // 1. Authenticate using existing auth infrastructure
  const ctx = await createContextFromRequest(req);
  if (!ctx.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse messages from request body
  const { messages }: { messages: CoreMessage[] } = await req.json();

  // 3. Create tRPC caller scoped to this user (reuses all existing business logic + ownership checks)
  const api = createTrcpClientFromCtx(() => ctx);

  // 4. Create OpenAI-compatible provider from existing config
  const provider = createOpenAI({
    apiKey: serverConfig.inference.openAIApiKey,
    baseURL: serverConfig.inference.openAIBaseUrl,
  });

  // 5. Stream response with tools
  const result = streamText({
    model: provider(serverConfig.inference.inferenceTextModel),
    system: `You are a helpful bookmark assistant for Karakeep. You help users find, organize, and manage their bookmarks, tags, and lists. Be concise and helpful. When searching, prefer showing results rather than asking clarifying questions. When showing bookmarks, include titles and URLs. Format responses in markdown.`,
    messages,
    tools: getTools(api),
    maxSteps: 5, // Allow multi-step tool usage (e.g., search then tag)
  });

  return result.toDataStreamResponse();
}
```

### `apps/web/app/api/chat/tools.ts`

Define tools that delegate to the existing tRPC callers. Each tool maps to one or more existing tRPC procedures:

```typescript
import { tool } from "ai";
import { z } from "zod";

export function getTools(api: ReturnType<typeof createTrcpClientFromCtx>) {
  return {
    // --- SEARCH & READ ---
    searchBookmarks: tool({
      description: "Search bookmarks by text query. Returns matching bookmarks with titles, URLs, and tags.",
      parameters: z.object({
        query: z.string().describe("Search query text"),
      }),
      execute: async ({ query }) => {
        const result = await api.bookmarks.searchBookmarks({ text: query });
        return result.bookmarks.map(b => ({
          id: b.id,
          title: b.title ?? b.content?.title,
          url: b.content?.type === "link" ? b.content.url : undefined,
          tags: b.tags.map(t => t.name),
          createdAt: b.createdAt,
          note: b.note,
          summary: b.summary,
        }));
      },
    }),

    getBookmarks: tool({
      description: "List bookmarks with optional filters (archived, favourited, by tag). Use this when the user wants to browse rather than search.",
      parameters: z.object({
        archived: z.boolean().optional(),
        favourited: z.boolean().optional(),
        tagName: z.string().optional(),
        limit: z.number().max(20).default(10),
      }),
      execute: async ({ archived, favourited, tagName, limit }) => {
        const result = await api.bookmarks.getBookmarks({
          archived, favourited, limit,
          tagId: tagName ? (await findTagByName(api, tagName))?.id : undefined,
        });
        return result.bookmarks.map(formatBookmark);
      },
    }),

    // --- BOOKMARK MANAGEMENT ---
    createBookmark: tool({
      description: "Create a new bookmark from a URL or text note.",
      parameters: z.object({
        url: z.string().url().optional().describe("URL to bookmark"),
        text: z.string().optional().describe("Text content (for text-type bookmark)"),
        title: z.string().optional(),
        tags: z.array(z.string()).optional().describe("Tag names to attach"),
      }),
      execute: async ({ url, text, title, tags }) => {
        const type = url ? "link" : "text";
        const bookmark = await api.bookmarks.createBookmark({
          type,
          ...(url ? { url } : { text: text ?? "", title }),
        });
        // Attach tags if provided
        if (tags?.length) {
          const tagIds = await ensureTags(api, tags);
          await api.bookmarks.updateTags({
            bookmarkId: bookmark.id,
            attach: tagIds.map(id => ({ tagId: id })),
            detach: [],
          });
        }
        return { id: bookmark.id, title: bookmark.title, message: "Bookmark created" };
      },
    }),

    deleteBookmark: tool({
      description: "Delete a bookmark by ID. Ask user to confirm before deleting.",
      parameters: z.object({
        bookmarkId: z.string(),
      }),
      execute: async ({ bookmarkId }) => {
        await api.bookmarks.deleteBookmark({ bookmarkId });
        return { success: true, message: "Bookmark deleted" };
      },
    }),

    updateBookmark: tool({
      description: "Update bookmark properties (archive, favourite, add note).",
      parameters: z.object({
        bookmarkId: z.string(),
        archived: z.boolean().optional(),
        favourited: z.boolean().optional(),
        note: z.string().optional(),
        title: z.string().optional(),
      }),
      execute: async ({ bookmarkId, ...updates }) => {
        await api.bookmarks.updateBookmark({ bookmarkId, ...updates });
        return { success: true };
      },
    }),

    summarizeBookmark: tool({
      description: "Generate an AI summary of a bookmark's content.",
      parameters: z.object({ bookmarkId: z.string() }),
      execute: async ({ bookmarkId }) => {
        await api.bookmarks.summarizeBookmark({ bookmarkId });
        return { message: "Summary generation triggered" };
      },
    }),

    // --- TAG MANAGEMENT ---
    listTags: tool({
      description: "List all of the user's tags.",
      parameters: z.object({}),
      execute: async () => {
        const result = await api.tags.list();
        return result.tags.map(t => ({ id: t.id, name: t.name, numBookmarks: t.numBookmarks }));
      },
    }),

    addTagsToBookmark: tool({
      description: "Add tags to a bookmark. Creates tags if they don't exist.",
      parameters: z.object({
        bookmarkId: z.string(),
        tagNames: z.array(z.string()),
      }),
      execute: async ({ bookmarkId, tagNames }) => {
        const tagIds = await ensureTags(api, tagNames);
        await api.bookmarks.updateTags({
          bookmarkId,
          attach: tagIds.map(id => ({ tagId: id })),
          detach: [],
        });
        return { success: true, tags: tagNames };
      },
    }),

    removeTagsFromBookmark: tool({
      description: "Remove tags from a bookmark.",
      parameters: z.object({
        bookmarkId: z.string(),
        tagNames: z.array(z.string()),
      }),
      execute: async ({ bookmarkId, tagNames }) => {
        const tagIds = await Promise.all(tagNames.map(n => findTagByName(api, n)));
        await api.bookmarks.updateTags({
          bookmarkId,
          attach: [],
          detach: tagIds.filter(Boolean).map(t => ({ tagId: t!.id })),
        });
        return { success: true };
      },
    }),

    // --- LIST MANAGEMENT ---
    getLists: tool({
      description: "Get all of the user's bookmark lists.",
      parameters: z.object({}),
      execute: async () => {
        const result = await api.lists.list();
        return result.lists.map(l => ({ id: l.id, name: l.name, icon: l.icon, type: l.type }));
      },
    }),

    createList: tool({
      description: "Create a new bookmark list.",
      parameters: z.object({
        name: z.string(),
        icon: z.string().default("🔖"),
      }),
      execute: async ({ name, icon }) => {
        const list = await api.lists.create({ name, icon, type: "manual" });
        return { id: list.id, name: list.name };
      },
    }),

    addBookmarkToList: tool({
      description: "Add a bookmark to a list.",
      parameters: z.object({
        bookmarkId: z.string(),
        listId: z.string(),
      }),
      execute: async ({ bookmarkId, listId }) => {
        await api.lists.addToList({ bookmarkId, listId });
        return { success: true };
      },
    }),

    removeBookmarkFromList: tool({
      description: "Remove a bookmark from a list.",
      parameters: z.object({
        bookmarkId: z.string(),
        listId: z.string(),
      }),
      execute: async ({ bookmarkId, listId }) => {
        await api.lists.removeFromList({ bookmarkId, listId });
        return { success: true };
      },
    }),
  };
}

// Helper: find tag by name
async function findTagByName(api, name: string) {
  const { tags } = await api.tags.list();
  return tags.find(t => t.name.toLowerCase() === name.toLowerCase());
}

// Helper: ensure tags exist, return IDs
async function ensureTags(api, names: string[]): Promise<string[]> {
  const { tags: existing } = await api.tags.list();
  return Promise.all(names.map(async (name) => {
    const found = existing.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (found) return found.id;
    const created = await api.tags.create({ name });
    return created.id;
  }));
}
```

---

## 4. Client Side: Chat UI

### `apps/web/components/chat/AIChatPanel.tsx`

Main floating panel component using Vercel AI SDK's `useChat` hook:

```tsx
"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@karakeep/ui/button";
import { Card } from "@karakeep/ui/card";
import { Input } from "@karakeep/ui/input";
import { ScrollArea } from "@karakeep/ui/scroll-area";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatToolInvocation } from "./ChatToolInvocation";

export function AIChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    // No persistence - conversation resets when panel closes
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  return (
    <Card className="fixed bottom-20 right-6 z-50 flex h-[600px] w-[420px] flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">Bookmark Assistant</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-center text-sm">
            Ask me to find bookmarks, organize tags, manage lists, or save new links.
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
          </div>
        )}
        {error && <div className="text-destructive text-sm">Error: {error.message}</div>}
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Search bookmarks, manage tags..."
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

### `apps/web/components/chat/AIChatToggle.tsx`

Floating action button placed in the dashboard layout:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@karakeep/ui/button";
import { MessageCircle } from "lucide-react";
import { AIChatPanel } from "./AIChatPanel";

export function AIChatToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AIChatPanel open={open} onClose={() => setOpen(false)} />
      {!open && (
        <Button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </>
  );
}
```

### `apps/web/components/chat/ChatMessage.tsx`

Renders individual messages with markdown and tool invocation results:

```tsx
import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";
import { ChatToolInvocation } from "./ChatToolInvocation";

export function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-4 flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && <Bot className="h-6 w-6 shrink-0 mt-1" />}
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      }`}>
        {/* Render text parts */}
        {message.parts?.filter(p => p.type === "text").map((part, i) => (
          <ReactMarkdown key={i}>{part.text}</ReactMarkdown>
        ))}
        {/* Render tool invocation parts */}
        {message.parts?.filter(p => p.type === "tool-invocation").map((part, i) => (
          <ChatToolInvocation key={i} invocation={part.toolInvocation} />
        ))}
        {/* Fallback for simple content */}
        {!message.parts && <ReactMarkdown>{message.content}</ReactMarkdown>}
      </div>
      {isUser && <User className="h-6 w-6 shrink-0 mt-1" />}
    </div>
  );
}
```

### `apps/web/components/chat/ChatToolInvocation.tsx`

Shows collapsible tool call results:

```tsx
export function ChatToolInvocation({ invocation }) {
  const toolLabels = {
    searchBookmarks: "Searching bookmarks",
    getBookmarks: "Fetching bookmarks",
    createBookmark: "Creating bookmark",
    deleteBookmark: "Deleting bookmark",
    listTags: "Listing tags",
    addTagsToBookmark: "Adding tags",
    getLists: "Listing collections",
    // ... etc
  };

  return (
    <div className="my-2 text-xs text-muted-foreground border rounded p-2">
      <span>{toolLabels[invocation.toolName] ?? invocation.toolName}</span>
      {invocation.state === "result" && (
        <span className="ml-2 text-green-600">Done</span>
      )}
    </div>
  );
}
```

---

## 5. Integration Point

### Mount the toggle in the dashboard layout

In `apps/web/app/dashboard/layout.tsx`, add `<AIChatToggle />`:

```tsx
import { AIChatToggle } from "@/components/chat/AIChatToggle";

// Inside the layout's return, after the main content:
<AIChatToggle />
```

The toggle should only render when:
1. The user is authenticated
2. AI/inference is configured (check `INFERENCE_TEXT_MODEL` and `OPENAI_API_KEY` are set)

Add a tRPC query or config endpoint to check if AI chat is available, or use the existing `config` router to expose this.

---

## 6. Configuration

Reuse existing inference config from `packages/shared/config.ts`:
- `OPENAI_API_KEY` - Required for the chat to work
- `OPENAI_BASE_URL` - For custom endpoints
- `INFERENCE_TEXT_MODEL` - Model to use (default "gpt-4o-mini")

Optionally add:
- `INFERENCE_CHAT_MODEL` - Override model specifically for chat (falls back to `INFERENCE_TEXT_MODEL`)

No new database tables needed (ephemeral chat).

---

## 7. Implementation Steps

### Step 1: Install dependencies
```bash
cd apps/web && pnpm add ai @ai-sdk/openai
```

### Step 2: Create the route handler
- `apps/web/app/api/chat/route.ts` - Main POST handler
- `apps/web/app/api/chat/tools.ts` - Tool definitions

### Step 3: Create the chat UI components
- `apps/web/components/chat/AIChatPanel.tsx`
- `apps/web/components/chat/AIChatToggle.tsx`
- `apps/web/components/chat/ChatMessage.tsx`
- `apps/web/components/chat/ChatToolInvocation.tsx`

### Step 4: Mount in dashboard layout
- Add `<AIChatToggle />` to `apps/web/app/dashboard/layout.tsx`

### Step 5: Add config check
- Expose whether AI chat is available via config router or server component check
- Only show the toggle button if inference is configured

### Step 6: Type-check and test
- `pnpm typecheck`
- Manual testing of the chat flow

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SDK | Vercel AI SDK (`ai`) | Best-in-class streaming, tool calling, React hooks |
| Provider | `@ai-sdk/openai` | Works with any OpenAI-compatible API |
| Route | Next.js route handler (`/api/chat`) | Standard Vercel AI SDK pattern, bypasses tRPC for streaming |
| Auth | Reuse `createContextFromRequest` | Same session/API key auth as existing APIs |
| Business logic | tRPC callers in tools | Reuses ALL existing validation, ownership checks, side effects |
| Chat persistence | None (ephemeral) | Simpler v1, can add later |
| UI | Floating panel | Available on all pages, non-intrusive |
| Tool safety | LLM asks for confirmation on deletes | System prompt instructs this |
| Multi-step | `maxSteps: 5` | Allows chaining (search -> tag -> confirm) |

---

## 9. Security Considerations

- **Auth**: Every chat request goes through `createContextFromRequest` - same auth as all other APIs
- **Ownership**: tRPC callers enforce per-user ownership (can't access other users' bookmarks)
- **Rate limiting**: Consider adding rate limiting to `/api/chat` endpoint (more expensive than normal API calls)
- **Tool safety**: Delete operations should be confirmed by the LLM before executing (via system prompt)
- **Input sanitization**: Vercel AI SDK handles message format validation
- **No prompt injection from bookmarks**: Tool results are returned as tool results (not injected into system prompt)

---

## 10. Future Enhancements (not in v1)

- Chat persistence with conversation history
- Keyboard shortcut to open panel (e.g., Cmd+K alternative)
- Suggested prompts / quick actions
- Streaming tool results (show search results as they come in)
- Mobile app integration
- Ollama native provider support
- Voice input
- File/image upload to create asset bookmarks via chat
