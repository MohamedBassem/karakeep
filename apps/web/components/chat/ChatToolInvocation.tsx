"use client";

import type { ToolInvocation } from "ai";
import { CheckCircle2, Loader2 } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  searchBookmarks: "Searching bookmarks",
  getBookmarks: "Fetching bookmarks",
  createBookmark: "Creating bookmark",
  deleteBookmark: "Deleting bookmark",
  updateBookmark: "Updating bookmark",
  summarizeBookmark: "Summarizing bookmark",
  listTags: "Listing tags",
  addTagsToBookmark: "Adding tags",
  removeTagsFromBookmark: "Removing tags",
  getLists: "Listing collections",
  createList: "Creating list",
  addBookmarkToList: "Adding to list",
  removeBookmarkFromList: "Removing from list",
};

export function ChatToolInvocation({
  invocation,
}: {
  invocation: ToolInvocation;
}) {
  const label = TOOL_LABELS[invocation.toolName] ?? invocation.toolName;
  const isDone = invocation.state === "result";

  return (
    <div className="my-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      {isDone ? (
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      <span>{label}</span>
    </div>
  );
}
