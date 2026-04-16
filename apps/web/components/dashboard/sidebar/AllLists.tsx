"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarItem from "@/components/shared/sidebar/SidebarItem";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTriggerTriangle,
} from "@/components/ui/collapsible";
import { toast } from "@/components/ui/sonner";
import { BOOKMARK_DRAG_MIME } from "@/lib/bookmark-drag";
import { useTranslation } from "@/lib/i18n/client";
import {
  decodeListDragPayload,
  encodeListDragPayload,
  LIST_DRAG_MIME,
} from "@/lib/list-drag";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Plus } from "lucide-react";

import type { ZBookmarkList } from "@karakeep/shared/types/lists";
import {
  augmentBookmarkListsWithInitialData,
  useAddBookmarkToList,
  useBookmarkLists,
  useReorderBookmarkLists,
} from "@karakeep/shared-react/hooks/lists";
import { ZBookmarkListTreeNode } from "@karakeep/shared/utils/listUtils";

import { CollapsibleBookmarkLists } from "../lists/CollapsibleBookmarkLists";
import { EditListModal } from "../lists/EditListModal";
import { ListOptions } from "../lists/ListOptions";
import { InvitationNotificationBadge } from "./InvitationNotificationBadge";

function useBookmarkDropTarget(listId: string, listName: string) {
  const { mutateAsync: addToList } = useAddBookmarkToList();
  const { t } = useTranslation();

  const onBookmarkDrop = useCallback(
    async (e: React.DragEvent) => {
      const bookmarkId = e.dataTransfer.getData(BOOKMARK_DRAG_MIME);
      if (!bookmarkId) return;
      try {
        await addToList({ bookmarkId, listId });
        toast({
          description: t("lists.add_to_list_success", {
            list: listName,
            defaultValue: `Added to "${listName}"`,
          }),
        });
      } catch {
        toast({
          description: t("common.something_went_wrong", {
            defaultValue: "Something went wrong",
          }),
          variant: "destructive",
        });
      }
    },
    [addToList, listId, listName, t],
  );

  return { onBookmarkDrop };
}

type ListDropPosition = "above" | "below" | "into";

function getListDropPosition(
  e: React.DragEvent,
  canAcceptBookmark: boolean,
): ListDropPosition | null {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  if (rect.height === 0) return null;
  const offset = e.clientY - rect.top;
  const ratio = offset / rect.height;
  const hasList = e.dataTransfer.types.includes(LIST_DRAG_MIME);
  const hasBookmark =
    canAcceptBookmark && e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME);

  if (hasBookmark && !hasList) {
    return "into";
  }
  if (!hasList) return null;
  // When also a valid bookmark drop target, give the middle region to "into".
  if (hasBookmark) {
    if (ratio < 0.25) return "above";
    if (ratio > 0.75) return "below";
    return "into";
  }
  return ratio < 0.5 ? "above" : "below";
}

function DroppableListSidebarItem({
  node,
  siblings,
  level,
  open,
  numBookmarks,
  selectedListId,
  setSelectedListId,
}: {
  node: ZBookmarkListTreeNode;
  siblings: ZBookmarkListTreeNode[];
  level: number;
  open: boolean;
  numBookmarks?: number;
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const canAcceptBookmark =
    node.item.type === "manual" &&
    (node.item.userRole === "owner" || node.item.userRole === "editor");
  const canBeReordered = node.item.userRole === "owner";

  const { onBookmarkDrop } = useBookmarkDropTarget(
    node.item.id,
    node.item.name,
  );
  const { mutateAsync: reorderLists } = useReorderBookmarkLists();

  const [dropPosition, setDropPosition] = useState<ListDropPosition | null>(
    null,
  );
  const dragCounterRef = useRef(0);

  const siblingIds = useMemo(
    () =>
      siblings.filter((s) => s.item.userRole === "owner").map((s) => s.item.id),
    [siblings],
  );

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!canBeReordered) return;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        LIST_DRAG_MIME,
        encodeListDragPayload({
          id: node.item.id,
          parentId: node.item.parentId,
        }),
      );
    },
    [canBeReordered, node.item.id, node.item.parentId],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      const pos = getListDropPosition(e, canAcceptBookmark);
      if (!pos) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = pos === "into" ? "copy" : "move";
      setDropPosition(pos);
    },
    [canAcceptBookmark],
  );

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      const pos = getListDropPosition(e, canAcceptBookmark);
      if (!pos) return;
      e.preventDefault();
      dragCounterRef.current++;
      setDropPosition(pos);
    },
    [canAcceptBookmark],
  );

  const onDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropPosition(null);
    }
  }, []);

  const onDragEnd = useCallback(() => {
    dragCounterRef.current = 0;
    setDropPosition(null);
  }, []);

  const handleListReorderDrop = useCallback(
    async (e: React.DragEvent, pos: "above" | "below") => {
      const payload = decodeListDragPayload(
        e.dataTransfer.getData(LIST_DRAG_MIME),
      );
      if (!payload) return;
      // Only allow reorder within the same parent and among owned siblings.
      if ((payload.parentId ?? null) !== (node.item.parentId ?? null)) {
        return;
      }
      if (payload.id === node.item.id) return;
      if (!siblingIds.includes(payload.id)) return;

      const filtered = siblingIds.filter((id) => id !== payload.id);
      const targetIndex = filtered.indexOf(node.item.id);
      if (targetIndex === -1) return;
      const insertAt = pos === "above" ? targetIndex : targetIndex + 1;
      const newOrder = [
        ...filtered.slice(0, insertAt),
        payload.id,
        ...filtered.slice(insertAt),
      ];

      // Avoid a no-op roundtrip.
      if (newOrder.every((id, i) => id === siblingIds[i])) return;

      try {
        await reorderLists({
          parentId: node.item.parentId ?? null,
          orderedListIds: newOrder,
        });
      } catch {
        toast({
          description: t("common.something_went_wrong", {
            defaultValue: "Something went wrong",
          }),
          variant: "destructive",
        });
      }
    },
    [node.item.id, node.item.parentId, reorderLists, siblingIds, t],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      const pos = dropPosition;
      dragCounterRef.current = 0;
      setDropPosition(null);

      if (e.dataTransfer.types.includes(LIST_DRAG_MIME)) {
        if (pos === "above" || pos === "below") {
          e.preventDefault();
          await handleListReorderDrop(e, pos);
          return;
        }
      }

      if (
        canAcceptBookmark &&
        e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)
      ) {
        e.preventDefault();
        await onBookmarkDrop(e);
      }
    },
    [canAcceptBookmark, dropPosition, handleListReorderDrop, onBookmarkDrop],
  );

  const insertIndicator =
    dropPosition === "above" || dropPosition === "below" ? dropPosition : null;
  const dropHighlight = dropPosition === "into" && canAcceptBookmark;

  return (
    <SidebarItem
      collapseButton={
        node.children.length > 0 && (
          <CollapsibleTriggerTriangle
            className="absolute left-0.5 top-1/2 size-2 -translate-y-1/2"
            open={open}
          />
        )
      }
      logo={
        <span className="flex">
          <span className="text-lg"> {node.item.icon}</span>
        </span>
      }
      name={node.item.name}
      path={`/dashboard/lists/${node.item.id}`}
      className="group px-0.5"
      right={
        <ListOptions
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setSelectedListId(node.item.id);
            } else {
              setSelectedListId(null);
            }
          }}
          list={node.item}
        >
          <Button size="none" variant="ghost" className="relative">
            <MoreHorizontal
              className={cn(
                "absolute inset-0 m-auto size-4 opacity-0 transition-opacity duration-100 group-hover:opacity-100",
                selectedListId == node.item.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span
              className={cn(
                "px-2.5 text-xs font-light text-muted-foreground opacity-100 transition-opacity duration-100 group-hover:opacity-0",
                selectedListId == node.item.id || numBookmarks === undefined
                  ? "opacity-0"
                  : "opacity-100",
              )}
            >
              {numBookmarks}
            </span>
          </Button>
        </ListOptions>
      }
      linkClassName="py-0.5"
      style={{ marginLeft: `${level * 1}rem` }}
      draggable={canBeReordered}
      dropHighlight={dropHighlight}
      insertIndicator={insertIndicator}
      onDragStart={canBeReordered ? onDragStart : undefined}
      onDragEnd={canBeReordered ? onDragEnd : undefined}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    />
  );
}

export default function AllLists({
  initialData,
}: {
  initialData: { lists: ZBookmarkList[] };
}) {
  const { t } = useTranslation();
  const pathName = usePathname();
  const isNodeOpen = useCallback(
    (node: ZBookmarkListTreeNode) => pathName.includes(node.item.id),
    [pathName],
  );

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Fetch live lists data
  const { data: listsData } = useBookmarkLists(undefined, {
    initialData: { lists: initialData.lists },
  });
  const lists = augmentBookmarkListsWithInitialData(
    listsData,
    initialData.lists,
  );

  // Check if any shared list is currently being viewed
  const isViewingSharedList = useMemo(() => {
    return lists.data.some(
      (list) => list.userRole !== "owner" && pathName.includes(list.id),
    );
  }, [lists.data, pathName]);

  // Check if there are any shared lists
  const hasSharedLists = useMemo(() => {
    return lists.data.some((list) => list.userRole !== "owner");
  }, [lists.data]);

  const [sharedListsOpen, setSharedListsOpen] = useState(isViewingSharedList);

  // Auto-open shared lists if viewing one
  useEffect(() => {
    if (isViewingSharedList && !sharedListsOpen) {
      setSharedListsOpen(true);
    }
  }, [isViewingSharedList, sharedListsOpen]);

  return (
    <ul className="sidebar-scrollbar max-h-full gap-y-2 overflow-auto text-sm">
      <li className="flex justify-between pb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Lists
        </p>
        <EditListModal>
          <Link href="#">
            <Plus
              className="mr-2 size-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </Link>
        </EditListModal>
      </li>
      <SidebarItem
        logo={<span className="text-lg">📋</span>}
        name={t("lists.all_lists")}
        path={`/dashboard/lists`}
        linkClassName="py-0.5"
        className="px-0.5"
        right={<InvitationNotificationBadge />}
      />
      <SidebarItem
        logo={<span className="text-lg">⭐️</span>}
        name={t("lists.favourites")}
        path={`/dashboard/favourites`}
        linkClassName="py-0.5"
        className="px-0.5"
      />

      {/* Owned Lists */}
      <CollapsibleBookmarkLists
        listsData={lists}
        filter={(node) => node.item.userRole === "owner"}
        isOpenFunc={isNodeOpen}
        render={({ node, level, open, numBookmarks, siblings }) => (
          <DroppableListSidebarItem
            node={node}
            siblings={siblings}
            level={level}
            open={open}
            numBookmarks={numBookmarks}
            selectedListId={selectedListId}
            setSelectedListId={setSelectedListId}
          />
        )}
      />

      {/* Shared Lists */}
      {hasSharedLists && (
        <Collapsible open={sharedListsOpen} onOpenChange={setSharedListsOpen}>
          <SidebarItem
            collapseButton={
              <CollapsibleTriggerTriangle
                className="absolute left-0.5 top-1/2 size-2 -translate-y-1/2"
                open={sharedListsOpen}
              />
            }
            logo={<span className="text-lg">👥</span>}
            name={t("lists.shared_lists")}
            path="#"
            linkClassName="py-0.5"
            className="px-0.5"
          />
          <CollapsibleContent>
            <CollapsibleBookmarkLists
              listsData={lists}
              filter={(node) => node.item.userRole !== "owner"}
              isOpenFunc={isNodeOpen}
              indentOffset={1}
              render={({ node, level, open, numBookmarks, siblings }) => (
                <DroppableListSidebarItem
                  node={node}
                  siblings={siblings}
                  level={level}
                  open={open}
                  numBookmarks={numBookmarks}
                  selectedListId={selectedListId}
                  setSelectedListId={setSelectedListId}
                />
              )}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </ul>
  );
}
