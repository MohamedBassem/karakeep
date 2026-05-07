import { beforeEach, describe, expect, it } from "vitest";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";

import useBulkActionsStore from "./bulkActions";

function bookmark(id: string) {
  return { id } as ZBookmark;
}

describe("useBulkActionsStore", () => {
  beforeEach(() => {
    useBulkActionsStore.setState({
      selectedBookmarkIds: [],
      visibleBookmarks: [],
      isBulkEditEnabled: false,
      listContext: undefined,
    });
  });

  it("toggles bookmark selection", () => {
    useBulkActionsStore.getState().toggleBookmark("a");
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual(["a"]);

    useBulkActionsStore.getState().toggleBookmark("a");
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual([]);
  });

  it("selects and unselects all visible bookmarks", () => {
    useBulkActionsStore
      .getState()
      .setVisibleBookmarks([bookmark("a"), bookmark("b")]);

    useBulkActionsStore.getState().selectAll();
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual([
      "a",
      "b",
    ]);
    expect(useBulkActionsStore.getState().isEverythingSelected()).toBe(true);

    useBulkActionsStore.getState().unSelectAll();
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual([]);
    expect(useBulkActionsStore.getState().isEverythingSelected()).toBe(false);
  });

  it("clears selection when bulk edit mode changes", () => {
    useBulkActionsStore.setState({
      isBulkEditEnabled: false,
      selectedBookmarkIds: ["a"],
    });

    useBulkActionsStore.getState().setIsBulkEditEnabled(true);
    expect(useBulkActionsStore.getState().isBulkEditEnabled).toBe(true);
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual([]);
  });

  it("preserves selection when bulk edit mode is set to the current value", () => {
    useBulkActionsStore.setState({
      isBulkEditEnabled: true,
      selectedBookmarkIds: ["a"],
    });

    useBulkActionsStore.getState().setIsBulkEditEnabled(true);
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual(["a"]);
  });
});
