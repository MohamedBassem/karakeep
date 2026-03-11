import type { ToolExecutionOptions } from "ai";
import { tool } from "ai";
import { z } from "zod";

import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import type { api as apiType } from "@/server/api/client";

type Api = typeof apiType;

/**
 * Wraps a tool execute function so that errors are returned as structured
 * error results instead of throwing. This lets the model see the error
 * and retry with corrected parameters.
 */
function withErrorHandling<PARAMS, RESULT>(
  fn: (params: PARAMS, options: ToolExecutionOptions) => Promise<RESULT>,
): (
  params: PARAMS,
  options: ToolExecutionOptions,
) => Promise<RESULT | { error: string }> {
  return async (params, options) => {
    try {
      return await fn(params, options);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { error: message };
    }
  };
}

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
        query: z.string()
          .describe(`The search query. By default, this does a full-text search, but you can also use qualifiers to filter results.
Qualifiers: is:fav (favorited), is:archived, is:tagged, is:inlist, is:link, is:text, is:media (filter by type), url:<value> (URL substring), #<tag> (by tag name), list:<name> (by list name without icon), after:<date> (YYYY-MM-DD), before:<date> (YYYY-MM-DD).
Quote names with spaces using double quotes. Negate a qualifier with a minus sign prefix. You can combine with "and", "or", and parentheses.
Examples:
- "is:fav after:2023-01-01 #important" — favorited bookmarks from 2023 tagged "important"
- "is:archived and (list:reading or #work)" — archived bookmarks in "reading" list or tagged "work"
- "machine learning is:fav" — text search combined with qualifier`),
      }),
      execute: withErrorHandling(async ({ query }) => {
        const result = (await api.bookmarks.searchBookmarks({
          text: query,
        })) as { bookmarks: Record<string, unknown>[] };
        return result.bookmarks.map(formatBookmark);
      }),
    }),

    getBookmarks: tool({
      description:
        "List bookmarks with optional filters (archived, favourited, by list or tag). Use this when the user wants to browse rather than search by text. Use listId to show bookmarks in a specific list, or tagId to show bookmarks with a specific tag.",
      parameters: z.object({
        archived: z.boolean().optional(),
        favourited: z.boolean().optional(),
        listId: z
          .string()
          .optional()
          .describe("Filter by list ID. Use getLists first to find the ID."),
        tagId: z
          .string()
          .optional()
          .describe("Filter by tag ID. Use searchTags first to find the ID."),
        limit: z.number().max(20).default(10),
      }),
      execute: withErrorHandling(
        async ({ archived, favourited, listId, tagId, limit }) => {
          const result = await api.bookmarks.getBookmarks({
            archived,
            favourited,
            listId,
            tagId,
            limit,
          });
          return result.bookmarks.map(formatBookmark);
        },
      ),
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
      execute: withErrorHandling(async ({ url, text, title }) => {
        if (url) {
          const bookmark = await api.bookmarks.createBookmark({
            type: BookmarkTypes.LINK,
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
          type: BookmarkTypes.TEXT,
          text: text ?? "",
          title,
        });
        return {
          id: bookmark.id,
          title: bookmark.title,
          message: "Text bookmark created",
        };
      }),
    }),

    deleteBookmark: tool({
      description:
        "Delete a bookmark by ID. Always confirm with the user before calling this.",
      parameters: z.object({
        bookmarkId: z.string(),
      }),
      execute: withErrorHandling(async ({ bookmarkId }) => {
        await api.bookmarks.deleteBookmark({ bookmarkId });
        return { success: true, message: "Bookmark deleted" };
      }),
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
      execute: withErrorHandling(async ({ bookmarkId, ...updates }) => {
        await api.bookmarks.updateBookmark({ bookmarkId, ...updates });
        return { success: true, message: "Bookmark updated" };
      }),
    }),

    getBookmarkContent: tool({
      description:
        "Get the full text content of a bookmark. Use this when the user wants to read or know more about a specific bookmark's content.",
      parameters: z.object({
        bookmarkId: z.string(),
      }),
      execute: withErrorHandling(async ({ bookmarkId }) => {
        const bookmark = await api.bookmarks.getBookmark({
          bookmarkId,
          includeContent: true,
        });
        if (bookmark.content.type === "link") {
          return {
            title: bookmark.title ?? bookmark.content.title,
            url: bookmark.content.url,
            content: bookmark.content.htmlContent ?? "",
          };
        } else if (bookmark.content.type === "text") {
          return {
            title: bookmark.title,
            content: bookmark.content.text,
          };
        } else if (bookmark.content.type === "asset") {
          return {
            title: bookmark.title,
            content: bookmark.content.content ?? "",
          };
        }
        return { title: bookmark.title, content: "" };
      }),
    }),

    searchTags: tool({
      description:
        "Search for tags by name. Returns matching tags with bookmark counts. Use this to find tag IDs before filtering bookmarks by tag.",
      parameters: z.object({
        query: z.string().describe("Search text to match against tag names"),
        limit: z.number().max(20).default(10),
      }),
      execute: withErrorHandling(async ({ query, limit }) => {
        const result = (await api.tags.list({
          nameContains: query,
          limit,
        })) as {
          tags: { id: string; name: string; numBookmarks: number }[];
        };
        return result.tags.map((t) => ({
          id: t.id,
          name: t.name,
          numBookmarks: t.numBookmarks,
        }));
      }),
    }),

    addTagsToBookmark: tool({
      description:
        "Add tags to a bookmark by name. Creates tags if they don't exist.",
      parameters: z.object({
        bookmarkId: z.string(),
        tagNames: z.array(z.string()),
      }),
      execute: withErrorHandling(async ({ bookmarkId, tagNames }) => {
        await api.bookmarks.updateTags({
          bookmarkId,
          attach: tagNames.map((tagName) => ({ tagName })),
          detach: [],
        });
        return { success: true, tags: tagNames };
      }),
    }),

    removeTagsFromBookmark: tool({
      description: "Remove tags from a bookmark by name.",
      parameters: z.object({
        bookmarkId: z.string(),
        tagNames: z.array(z.string()),
      }),
      execute: withErrorHandling(async ({ bookmarkId, tagNames }) => {
        await api.bookmarks.updateTags({
          bookmarkId,
          attach: [],
          detach: tagNames.map((tagName) => ({ tagName })),
        });
        return { success: true };
      }),
    }),

    updateTag: tool({
      description: "Rename a tag. Use searchTags first to find the tag ID.",
      parameters: z.object({
        tagId: z.string(),
        name: z.string().describe("The new name for the tag"),
      }),
      execute: withErrorHandling(async ({ tagId, name }) => {
        const tag = await api.tags.update({ tagId, name });
        return { success: true, id: tag.id, name: tag.name };
      }),
    }),

    deleteTag: tool({
      description:
        "Delete a tag by ID. Always confirm with the user before calling this. Use searchTags first to find the tag ID.",
      parameters: z.object({
        tagId: z.string(),
      }),
      execute: withErrorHandling(async ({ tagId }) => {
        await api.tags.delete({ tagId });
        return { success: true, message: "Tag deleted" };
      }),
    }),

    getLists: tool({
      description: "Get all of the user's bookmark lists/collections.",
      parameters: z.object({}),
      execute: withErrorHandling(async () => {
        const result = await api.lists.list();
        return result.lists.map((l) => ({
          id: l.id,
          name: l.name,
          icon: l.icon,
          type: l.type,
        }));
      }),
    }),

    createList: tool({
      description: "Create a new bookmark list/collection.",
      parameters: z.object({
        name: z.string(),
        icon: z.string().default("🔖"),
      }),
      execute: withErrorHandling(async ({ name, icon }) => {
        const list = await api.lists.create({
          name,
          icon,
          type: "manual",
        });
        return { id: list.id, name: list.name };
      }),
    }),

    addBookmarkToList: tool({
      description: "Add a bookmark to a list.",
      parameters: z.object({
        bookmarkId: z.string(),
        listId: z.string(),
      }),
      execute: withErrorHandling(async ({ bookmarkId, listId }) => {
        await api.lists.addToList({ bookmarkId, listId });
        return { success: true };
      }),
    }),

    removeBookmarkFromList: tool({
      description: "Remove a bookmark from a list.",
      parameters: z.object({
        bookmarkId: z.string(),
        listId: z.string(),
      }),
      execute: withErrorHandling(async ({ bookmarkId, listId }) => {
        await api.lists.removeFromList({ bookmarkId, listId });
        return { success: true };
      }),
    }),

    deleteList: tool({
      description:
        "Delete a bookmark list/collection by ID. Always confirm with the user before calling this.",
      parameters: z.object({
        listId: z.string(),
      }),
      execute: withErrorHandling(async ({ listId }) => {
        await api.lists.delete({ listId });
        return { success: true, message: "List deleted" };
      }),
    }),
  };
}
