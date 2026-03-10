import { tool } from "ai";
import { z } from "zod";

import type { api as apiType } from "@/server/api/client";

type Api = typeof apiType;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatBookmark(b: any) {
  return {
    id: b.id as string,
    title: (b.title ?? b.content?.title) as string | undefined,
    url: b.content?.type === "link" ? (b.content.url as string) : undefined,
    type: b.content?.type as string | undefined,
    tags: (b.tags?.map((t: { name: string }) => t.name) ?? []) as string[],
    createdAt: b.createdAt as Date,
    note: b.note as string | undefined,
    summary: b.summary as string | undefined,
  };
}

export function getTools(api: Api) {
  return {
    searchBookmarks: tool({
      description:
        "Search bookmarks by text query. Returns matching bookmarks with titles, URLs, and tags.",
      parameters: z.object({
        query: z.string().describe("Search query text"),
      }),
      execute: async ({ query }) => {
        const result = (await api.bookmarks.searchBookmarks({
          text: query,
        })) as { bookmarks: Record<string, unknown>[] };
        return result.bookmarks.map(formatBookmark);
      },
    }),

    getBookmarks: tool({
      description:
        "List bookmarks with optional filters (archived, favourited). Use this when the user wants to browse rather than search by text.",
      parameters: z.object({
        archived: z.boolean().optional(),
        favourited: z.boolean().optional(),
        limit: z.number().max(20).default(10),
      }),
      execute: async ({ archived, favourited, limit }) => {
        const result = await api.bookmarks.getBookmarks({
          archived,
          favourited,
          limit,
        });
        return result.bookmarks.map(formatBookmark);
      },
    }),

    createBookmark: tool({
      description: "Create a new bookmark from a URL or text note.",
      parameters: z.object({
        url: z.string().optional().describe("URL to bookmark"),
        text: z
          .string()
          .optional()
          .describe("Text content for a text bookmark"),
        title: z.string().optional(),
      }),
      execute: async ({ url, text, title }) => {
        if (url) {
          const bookmark = await api.bookmarks.createBookmark({
            type: "link",
            url,
            title,
          });
          return {
            id: bookmark.id,
            title: bookmark.title,
            message: "Bookmark created",
          };
        }
        const bookmark = await api.bookmarks.createBookmark({
          type: "text",
          text: text ?? "",
          title,
        });
        return {
          id: bookmark.id,
          title: bookmark.title,
          message: "Text bookmark created",
        };
      },
    }),

    deleteBookmark: tool({
      description:
        "Delete a bookmark by ID. Always confirm with the user before calling this.",
      parameters: z.object({
        bookmarkId: z.string(),
      }),
      execute: async ({ bookmarkId }) => {
        await api.bookmarks.deleteBookmark({ bookmarkId });
        return { success: true, message: "Bookmark deleted" };
      },
    }),

    updateBookmark: tool({
      description:
        "Update bookmark properties like archiving, favouriting, or adding a note.",
      parameters: z.object({
        bookmarkId: z.string(),
        archived: z.boolean().optional(),
        favourited: z.boolean().optional(),
        note: z.string().optional(),
        title: z.string().optional(),
      }),
      execute: async ({ bookmarkId, ...updates }) => {
        await api.bookmarks.updateBookmark({ bookmarkId, ...updates });
        return { success: true, message: "Bookmark updated" };
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

    listTags: tool({
      description: "List all of the user's tags with bookmark counts.",
      parameters: z.object({}),
      execute: async () => {
        const result = (await api.tags.list({})) as {
          tags: { id: string; name: string; numBookmarks: number }[];
        };
        return result.tags.map((t) => ({
          id: t.id,
          name: t.name,
          numBookmarks: t.numBookmarks,
        }));
      },
    }),

    addTagsToBookmark: tool({
      description:
        "Add tags to a bookmark by name. Creates tags if they don't exist.",
      parameters: z.object({
        bookmarkId: z.string(),
        tagNames: z.array(z.string()),
      }),
      execute: async ({ bookmarkId, tagNames }) => {
        await api.bookmarks.updateTags({
          bookmarkId,
          attach: tagNames.map((tagName) => ({ tagName })),
          detach: [],
        });
        return { success: true, tags: tagNames };
      },
    }),

    removeTagsFromBookmark: tool({
      description: "Remove tags from a bookmark by name.",
      parameters: z.object({
        bookmarkId: z.string(),
        tagNames: z.array(z.string()),
      }),
      execute: async ({ bookmarkId, tagNames }) => {
        await api.bookmarks.updateTags({
          bookmarkId,
          attach: [],
          detach: tagNames.map((tagName) => ({ tagName })),
        });
        return { success: true };
      },
    }),

    getLists: tool({
      description: "Get all of the user's bookmark lists/collections.",
      parameters: z.object({}),
      execute: async () => {
        const result = await api.lists.list();
        return result.lists.map((l) => ({
          id: l.id,
          name: l.name,
          icon: l.icon,
          type: l.type,
        }));
      },
    }),

    createList: tool({
      description: "Create a new bookmark list/collection.",
      parameters: z.object({
        name: z.string(),
        icon: z.string().default("🔖"),
      }),
      execute: async ({ name, icon }) => {
        const list = await api.lists.create({
          name,
          icon,
          type: "manual",
        });
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
