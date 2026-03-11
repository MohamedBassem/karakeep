import { useCallback } from "react";
import type { Message } from "ai";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@karakeep/shared-react/trpc";

type InvalidationGroup =
  | "bookmarksList"
  | "bookmarkDetail"
  | "tags"
  | "lists"
  | "listsOfBookmark"
  | "stats";

const TOOL_INVALIDATION_MAP: Record<string, InvalidationGroup[]> = {
  createBookmark: ["bookmarksList", "stats"],
  deleteBookmark: ["bookmarksList", "stats"],
  updateBookmark: ["bookmarksList", "bookmarkDetail", "stats"],
  addTagsToBookmark: ["bookmarkDetail", "tags", "stats"],
  removeTagsFromBookmark: ["bookmarkDetail", "tags", "stats"],
  createList: ["lists", "stats"],
  deleteList: ["lists", "stats"],
  addBookmarkToList: ["bookmarksList", "listsOfBookmark", "stats"],
  removeBookmarkFromList: ["bookmarksList", "listsOfBookmark", "stats"],
};

export function useChatCacheInvalidation() {
  const api = useTRPC();
  const queryClient = useQueryClient();

  const onFinish = useCallback(
    (message: Message) => {
      const toolInvocations = message.parts
        ?.filter((p) => p.type === "tool-invocation")
        .map(
          (p) =>
            p as {
              type: "tool-invocation";
              toolInvocation: { toolName: string; state: string };
            },
        );

      if (!toolInvocations?.length) return;

      const groups = new Set<InvalidationGroup>();
      for (const part of toolInvocations) {
        const mapping = TOOL_INVALIDATION_MAP[part.toolInvocation.toolName];
        if (mapping) {
          for (const group of mapping) {
            groups.add(group);
          }
        }
      }

      if (groups.size === 0) return;

      for (const group of groups) {
        switch (group) {
          case "bookmarksList":
            queryClient.invalidateQueries(
              api.bookmarks.getBookmarks.pathFilter(),
            );
            queryClient.invalidateQueries(
              api.bookmarks.searchBookmarks.pathFilter(),
            );
            break;
          case "bookmarkDetail":
            queryClient.invalidateQueries(
              api.bookmarks.getBookmark.pathFilter(),
            );
            break;
          case "tags":
            queryClient.invalidateQueries(api.tags.list.pathFilter());
            break;
          case "lists":
            queryClient.invalidateQueries(api.lists.list.pathFilter());
            break;
          case "listsOfBookmark":
            queryClient.invalidateQueries(
              api.lists.getListsOfBookmark.pathFilter(),
            );
            break;
          case "stats":
            queryClient.invalidateQueries(api.lists.stats.pathFilter());
            break;
        }
      }
    },
    [api, queryClient],
  );

  return onFinish;
}
