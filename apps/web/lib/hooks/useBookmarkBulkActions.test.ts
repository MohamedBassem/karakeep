// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useBulkActionsStore from "@/lib/bulkActions";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import type { ZBookmarkList } from "@karakeep/shared/types/lists";

const mutators = vi.hoisted(() => ({
  updateMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
  recrawlMutateAsync: vi.fn(),
  removeFromListMutateAsync: vi.fn(),
}));

vi.mock("@karakeep/shared-react/hooks/bookmarks", () => ({
  useUpdateBookmark: () => ({
    mutateAsync: mutators.updateMutateAsync,
    isPending: false,
  }),
  useDeleteBookmark: () => ({
    mutateAsync: mutators.deleteMutateAsync,
    isPending: false,
  }),
  useRecrawlBookmark: () => ({
    mutateAsync: mutators.recrawlMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@karakeep/shared-react/hooks/lists", () => ({
  useRemoveBookmarkFromList: () => ({
    mutateAsync: mutators.removeFromListMutateAsync,
    isPending: false,
  }),
}));

import {
  useBookmarkBulkMutations,
  useBookmarkBulkSelection,
} from "./useBookmarkBulkActions";

function bookmark(id: string, userId = "user-1", type = "link") {
  return {
    id,
    userId,
    favourited: false,
    archived: false,
    content: {
      type,
      url: `https://example.com/${id}`,
    },
  } as ZBookmark;
}

function renderBulkSelectionHook(
  props?: Parameters<typeof useBookmarkBulkSelection>[0],
) {
  return renderHook(() => useBookmarkBulkSelection(props)).result;
}

describe("useBookmarkBulkSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBulkActionsStore.setState({
      selectedBookmarkIds: [],
      visibleBookmarks: [],
      isBulkEditEnabled: false,
      listContext: undefined,
    });
  });

  it("derives selected bookmarks from visible bookmarks in visible order", () => {
    const bookmarks = [bookmark("a"), bookmark("b"), bookmark("c")];
    useBulkActionsStore.setState({
      selectedBookmarkIds: ["c", "a"],
      visibleBookmarks: bookmarks,
      isBulkEditEnabled: true,
    });

    const { current } = renderBulkSelectionHook();

    expect(current.selectedBookmarks.map((item) => item.id)).toEqual([
      "a",
      "c",
    ]);
    expect(current.hasBulkSelection).toBe(true);
  });

  it("filters selected actionable bookmarks with the provided predicate", () => {
    const bookmarks = [
      bookmark("owned", "user-1"),
      bookmark("shared", "user-2"),
    ];
    useBulkActionsStore.setState({
      selectedBookmarkIds: ["owned", "shared"],
      visibleBookmarks: bookmarks,
      isBulkEditEnabled: true,
    });

    const { current } = renderBulkSelectionHook({
      canActOnBookmark: (item) => item.userId === "user-1",
    });

    expect(current.selectedBookmarks.map((item) => item.id)).toEqual([
      "owned",
      "shared",
    ]);
    expect(
      current.selectedActionableBookmarks().map((item) => item.id),
    ).toEqual(["owned"]);
  });

  it("does not report a bulk selection unless bulk edit is enabled", () => {
    useBulkActionsStore.setState({
      selectedBookmarkIds: ["a"],
      visibleBookmarks: [bookmark("a")],
      isBulkEditEnabled: false,
    });

    const { current } = renderBulkSelectionHook();

    expect(current.hasBulkSelection).toBe(false);
  });

  it("enables bulk edit with the current bookmarks before selecting them", () => {
    const bookmarks = [bookmark("a"), bookmark("b")];
    const { current } = renderBulkSelectionHook();

    act(() => {
      current.selectBookmarks(bookmarks);
    });

    expect(useBulkActionsStore.getState().isBulkEditEnabled).toBe(true);
    expect(useBulkActionsStore.getState().visibleBookmarks).toEqual(bookmarks);
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual([
      "a",
      "b",
    ]);
  });

  it("refreshes visible bookmarks when enabling bulk edit clears selection", () => {
    const bookmarks = [bookmark("a")];
    const { current } = renderBulkSelectionHook();

    act(() => {
      current.enableBulkEditWithBookmarks(bookmarks);
    });

    expect(useBulkActionsStore.getState().isBulkEditEnabled).toBe(true);
    expect(useBulkActionsStore.getState().selectedBookmarkIds).toEqual([]);
    expect(useBulkActionsStore.getState().visibleBookmarks).toEqual(bookmarks);
  });
});

describe("useBookmarkBulkMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutators.updateMutateAsync.mockImplementation((input) =>
      Promise.resolve({ id: input.bookmarkId }),
    );
    mutators.deleteMutateAsync.mockResolvedValue({});
    mutators.recrawlMutateAsync.mockResolvedValue({});
    mutators.removeFromListMutateAsync.mockResolvedValue({});
  });

  it("updates each actionable selected bookmark", async () => {
    const selected = [bookmark("a"), bookmark("b")];
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected }),
    );

    await act(async () => {
      await result.current.updateSelectedBookmarks({ archived: true });
    });

    expect(mutators.updateMutateAsync).toHaveBeenCalledTimes(2);
    expect(mutators.updateMutateAsync).toHaveBeenNthCalledWith(1, {
      bookmarkId: "a",
      archived: true,
    });
    expect(mutators.updateMutateAsync).toHaveBeenNthCalledWith(2, {
      bookmarkId: "b",
      archived: true,
    });
  });

  it("sets a boolean field to enabled unless all selected bookmarks already have it", async () => {
    const selected = [
      { ...bookmark("a"), favourited: false },
      { ...bookmark("b"), favourited: true },
    ];
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected }),
    );

    await act(async () => {
      await result.current.setSelectedBookmarksToNextState("favourited");
    });

    expect(mutators.updateMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "a",
      favourited: true,
    });
    expect(mutators.updateMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "b",
      favourited: true,
    });
  });

  it("sets a boolean field to disabled when all selected bookmarks already have it", async () => {
    const selected = [
      { ...bookmark("a"), archived: true },
      { ...bookmark("b"), archived: true },
    ];
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected }),
    );

    await act(async () => {
      await result.current.setSelectedBookmarksToNextState("archived");
    });

    expect(mutators.updateMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "a",
      archived: false,
    });
    expect(mutators.updateMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "b",
      archived: false,
    });
  });

  it("deletes selected actionable bookmarks with settled results", async () => {
    const selected = [bookmark("a"), bookmark("b")];
    mutators.deleteMutateAsync
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected }),
    );

    let settled: PromiseSettledResult<unknown>[] = [];
    await act(async () => {
      settled = await result.current.deleteSelectedBookmarksSettled();
    });

    expect(mutators.deleteMutateAsync).toHaveBeenCalledTimes(2);
    expect(settled.map((item) => item.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
  });

  it("recrawls only selected link bookmarks", async () => {
    const selected = [bookmark("link"), bookmark("asset", "user-1", "asset")];
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected }),
    );

    let links: ZBookmark[] = [];
    await act(async () => {
      links = await result.current.recrawlSelectedLinkBookmarks(true);
    });

    expect(links.map((item) => item.id)).toEqual(["link"]);
    expect(mutators.recrawlMutateAsync).toHaveBeenCalledTimes(1);
    expect(mutators.recrawlMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "link",
      archiveFullPage: true,
    });
  });

  it("removes selected bookmarks from the provided list context", async () => {
    const selected = [bookmark("a"), bookmark("b")];
    const listContext = { id: "list-1" } as ZBookmarkList;
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected, listContext }),
    );

    await act(async () => {
      await result.current.removeSelectedBookmarksFromList();
    });

    expect(mutators.removeFromListMutateAsync).toHaveBeenCalledTimes(2);
    expect(mutators.removeFromListMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "a",
      listId: "list-1",
    });
    expect(mutators.removeFromListMutateAsync).toHaveBeenCalledWith({
      bookmarkId: "b",
      listId: "list-1",
    });
  });

  it("builds clipboard text from selected link bookmarks", () => {
    const selected = [bookmark("a"), bookmark("asset", "user-1", "asset")];
    const { result } = renderHook(() =>
      useBookmarkBulkMutations({ selectedBookmarks: selected }),
    );

    expect(result.current.selectedBookmarkLinksText()).toBe(
      "https://example.com/a",
    );
  });
});
