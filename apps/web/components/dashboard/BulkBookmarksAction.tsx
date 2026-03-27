"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ActionButton,
  ActionButtonWithTooltip,
} from "@/components/ui/action-button";
import ActionConfirmingDialog from "@/components/ui/action-confirming-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import useBulkActionsStore from "@/lib/bulkActions";
import { useTranslation } from "@/lib/i18n/client";
import {
  CheckCheck,
  ChevronDown,
  ExternalLink,
  FileDown,
  Hash,
  Link,
  List,
  ListMinus,
  MoreHorizontal,
  Pencil,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";

import {
  useDeleteBookmark,
  useRecrawlBookmark,
  useUpdateBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import { useRemoveBookmarkFromList } from "@karakeep/shared-react/hooks/lists";
import { limitConcurrency } from "@karakeep/shared/concurrency";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import BulkManageListsModal from "./bookmarks/BulkManageListsModal";
import BulkTagModal from "./bookmarks/BulkTagModal";
import { ArchivedActionIcon, FavouritedActionIcon } from "./bookmarks/icons";

const MAX_CONCURRENT_BULK_ACTIONS = 50;

function BulkDropdownButton({
  icon,
  tooltip,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  tooltip: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionButtonWithTooltip
          tooltip={tooltip}
          disabled={disabled}
          delayDuration={100}
          loading={false}
          variant="ghost"
        >
          <span className="flex items-center gap-0.5">
            {icon}
            <ChevronDown size={12} />
          </span>
        </ActionButtonWithTooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function BulkBookmarksAction() {
  const { t } = useTranslation();
  const {
    selectedBookmarks,
    isBulkEditEnabled,
    listContext: withinListContext,
  } = useBulkActionsStore();
  const setIsBulkEditEnabled = useBulkActionsStore(
    (state) => state.setIsBulkEditEnabled,
  );
  const selectAllBookmarks = useBulkActionsStore((state) => state.selectAll);
  const unSelectAllBookmarks = useBulkActionsStore(
    (state) => state.unSelectAll,
  );
  const isEverythingSelected = useBulkActionsStore(
    (state) => state.isEverythingSelected,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRemoveFromListDialogOpen, setIsRemoveFromListDialogOpen] =
    useState(false);
  const [manageListsModal, setManageListsModalOpen] = useState(false);
  const [bulkTagModal, setBulkTagModalOpen] = useState(false);
  const pathname = usePathname();
  const [currentPathname, setCurrentPathname] = useState("");

  // Reset bulk edit state when the route changes
  useEffect(() => {
    if (pathname !== currentPathname) {
      setCurrentPathname(pathname);
      setIsBulkEditEnabled(false);
    }
  }, [pathname, currentPathname]);

  const onError = () => {
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: "There was a problem with your request.",
    });
  };

  const deleteBookmarkMutator = useDeleteBookmark({
    onSuccess: () => {
      setIsBulkEditEnabled(false);
    },
    onError,
  });

  const updateBookmarkMutator = useUpdateBookmark({
    onSuccess: () => {
      setIsBulkEditEnabled(false);
    },
    onError,
  });

  const recrawlBookmarkMutator = useRecrawlBookmark({
    onSuccess: () => {
      setIsBulkEditEnabled(false);
    },
    onError,
  });

  const removeBookmarkFromListMutator = useRemoveBookmarkFromList({
    onSuccess: () => {
      setIsBulkEditEnabled(false);
    },
    onError,
  });

  interface UpdateBookmarkProps {
    favourited?: boolean;
    archived?: boolean;
  }

  const recrawlBookmarks = async (archiveFullPage: boolean) => {
    const links = selectedBookmarks.filter(
      (item) => item.content.type === BookmarkTypes.LINK,
    );
    await Promise.all(
      limitConcurrency(
        links.map(
          (item) => () =>
            recrawlBookmarkMutator.mutateAsync({
              bookmarkId: item.id,
              archiveFullPage,
            }),
        ),
        MAX_CONCURRENT_BULK_ACTIONS,
      ),
    );
    toast({
      description: `${links.length} bookmarks will be ${archiveFullPage ? "re-crawled and archived!" : "refreshed!"}`,
    });
  };

  function isClipboardAvailable() {
    if (typeof window === "undefined") {
      return false;
    }
    return window && window.navigator && window.navigator.clipboard;
  }

  const copyLinks = async () => {
    if (!isClipboardAvailable()) {
      toast({
        description: `Copying is only available over https`,
      });
      return;
    }
    const copyString = selectedBookmarks
      .map((item) => {
        return item.content.type === BookmarkTypes.LINK && item.content.url;
      })
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(copyString);

    toast({
      description: `Added ${selectedBookmarks.length} bookmark links into the clipboard!`,
    });
  };

  const openInNewTabs = () => {
    const urls = selectedBookmarks
      .filter((item) => item.content.type === BookmarkTypes.LINK)
      .map((item) =>
        item.content.type === BookmarkTypes.LINK ? item.content.url : "",
      )
      .filter((url) => url.length > 0);

    for (const url of urls) {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    toast({
      description: `Opened ${urls.length} bookmarks in new tabs!`,
    });
  };

  const updateBookmarks = async ({
    favourited,
    archived,
  }: UpdateBookmarkProps) => {
    await Promise.all(
      limitConcurrency(
        selectedBookmarks.map(
          (item) => () =>
            updateBookmarkMutator.mutateAsync({
              bookmarkId: item.id,
              favourited,
              archived,
            }),
        ),
        MAX_CONCURRENT_BULK_ACTIONS,
      ),
    );
    toast({
      description: `${selectedBookmarks.length} bookmarks have been updated!`,
    });
  };

  const deleteBookmarks = async () => {
    await Promise.all(
      limitConcurrency(
        selectedBookmarks.map(
          (item) => () =>
            deleteBookmarkMutator.mutateAsync({ bookmarkId: item.id }),
        ),
        MAX_CONCURRENT_BULK_ACTIONS,
      ),
    );
    toast({
      description: `${selectedBookmarks.length} bookmarks have been deleted!`,
    });
    setIsDeleteDialogOpen(false);
  };

  const removeBookmarksFromList = async () => {
    if (!withinListContext) return;

    const results = await Promise.allSettled(
      limitConcurrency(
        selectedBookmarks.map(
          (item) => () =>
            removeBookmarkFromListMutator.mutateAsync({
              bookmarkId: item.id,
              listId: withinListContext.id,
            }),
        ),
        MAX_CONCURRENT_BULK_ACTIONS,
      ),
    );

    const successes = results.filter((r) => r.status === "fulfilled").length;
    if (successes > 0) {
      toast({
        description: `${successes} bookmarks have been removed from the list!`,
      });
    }
    setIsRemoveFromListDialogOpen(false);
  };

  const alreadyFavourited =
    selectedBookmarks.length &&
    selectedBookmarks.every((item) => item.favourited === true);

  const alreadyArchived =
    selectedBookmarks.length &&
    selectedBookmarks.every((item) => item.archived === true);

  const hasSelection = selectedBookmarks.length > 0;

  const showRemoveFromList =
    withinListContext &&
    withinListContext.type === "manual" &&
    (withinListContext.userRole === "editor" ||
      withinListContext.userRole === "owner");

  return (
    <div>
      <ActionConfirmingDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        title={"Delete Bookmarks"}
        description={<p>Are you sure you want to delete these bookmarks?</p>}
        actionButton={() => (
          <ActionButton
            type="button"
            variant="destructive"
            loading={deleteBookmarkMutator.isPending}
            onClick={() => deleteBookmarks()}
          >
            {t("actions.delete")}
          </ActionButton>
        )}
      />
      <ActionConfirmingDialog
        open={isRemoveFromListDialogOpen}
        setOpen={setIsRemoveFromListDialogOpen}
        title={"Remove Bookmarks from List"}
        description={
          <p>
            Are you sure you want to remove {selectedBookmarks.length} bookmarks
            from this list?
          </p>
        }
        actionButton={() => (
          <ActionButton
            type="button"
            variant="destructive"
            loading={removeBookmarkFromListMutator.isPending}
            onClick={() => removeBookmarksFromList()}
          >
            {t("actions.remove")}
          </ActionButton>
        )}
      />
      <BulkManageListsModal
        bookmarkIds={selectedBookmarks.map((b) => b.id)}
        open={manageListsModal}
        setOpen={setManageListsModalOpen}
      />
      <BulkTagModal
        bookmarkIds={selectedBookmarks.map((b) => b.id)}
        open={bulkTagModal}
        setOpen={setBulkTagModalOpen}
      />
      <div className="flex items-center">
        {isBulkEditEnabled && (
          <>
            {/* Lists dropdown */}
            <BulkDropdownButton
              icon={<List size={18} />}
              tooltip={t("actions.lists")}
              disabled={!hasSelection}
            >
              <DropdownMenuItem onClick={() => setManageListsModalOpen(true)}>
                <List size={16} />
                {t("actions.add_to_list")}
              </DropdownMenuItem>
              {showRemoveFromList && (
                <DropdownMenuItem
                  onClick={() => setIsRemoveFromListDialogOpen(true)}
                >
                  <ListMinus size={16} />
                  {t("actions.remove_from_list")}
                </DropdownMenuItem>
              )}
            </BulkDropdownButton>

            {/* Edit Tags */}
            <ActionButtonWithTooltip
              tooltip={t("actions.edit_tags")}
              disabled={!hasSelection}
              delayDuration={100}
              loading={false}
              variant="ghost"
              onClick={() => setBulkTagModalOpen(true)}
            >
              <Hash size={18} />
            </ActionButtonWithTooltip>

            {/* Favorite/Unfavorite */}
            <ActionButtonWithTooltip
              tooltip={
                alreadyFavourited
                  ? t("actions.unfavorite")
                  : t("actions.favorite")
              }
              disabled={!hasSelection}
              delayDuration={100}
              loading={updateBookmarkMutator.isPending}
              variant="ghost"
              onClick={() =>
                updateBookmarks({ favourited: !alreadyFavourited })
              }
            >
              <FavouritedActionIcon
                favourited={!!alreadyFavourited}
                size={18}
              />
            </ActionButtonWithTooltip>

            {/* Archive/Unarchive */}
            <ActionButtonWithTooltip
              tooltip={
                alreadyArchived ? t("actions.unarchive") : t("actions.archive")
              }
              disabled={!hasSelection}
              delayDuration={100}
              loading={updateBookmarkMutator.isPending}
              variant="ghost"
              onClick={() => updateBookmarks({ archived: !alreadyArchived })}
            >
              <ArchivedActionIcon size={18} archived={!!alreadyArchived} />
            </ActionButtonWithTooltip>

            {/* Delete */}
            <ActionButtonWithTooltip
              tooltip={t("actions.delete")}
              disabled={!hasSelection}
              delayDuration={100}
              loading={false}
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 size={18} color="red" />
            </ActionButtonWithTooltip>

            {/* More actions dropdown */}
            <BulkDropdownButton
              icon={<MoreHorizontal size={18} />}
              tooltip={t("actions.more_actions")}
              disabled={!hasSelection}
            >
              {isClipboardAvailable() && (
                <DropdownMenuItem onClick={() => copyLinks()}>
                  <Link size={16} />
                  {t("actions.copy_link")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openInNewTabs()}>
                <ExternalLink size={16} />
                {t("actions.open_in_new_tabs")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => recrawlBookmarks(true)}>
                <FileDown size={16} />
                {t("actions.preserve_offline_archive")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => recrawlBookmarks(false)}>
                <RotateCw size={16} />
                {t("actions.refresh")}
              </DropdownMenuItem>
            </BulkDropdownButton>

            {/* Select/Unselect All */}
            <ActionButtonWithTooltip
              tooltip={
                isEverythingSelected()
                  ? t("actions.unselect_all")
                  : t("actions.select_all")
              }
              delayDuration={100}
              loading={false}
              variant="ghost"
              onClick={() =>
                isEverythingSelected()
                  ? unSelectAllBookmarks()
                  : selectAllBookmarks()
              }
            >
              <p className="flex items-center gap-2">
                ( <CheckCheck size={18} /> {selectedBookmarks.length} )
              </p>
            </ActionButtonWithTooltip>

            {/* Close Bulk Edit */}
            <ActionButtonWithTooltip
              tooltip={t("actions.close_bulk_edit")}
              delayDuration={100}
              loading={false}
              variant="ghost"
              onClick={() => setIsBulkEditEnabled(false)}
            >
              <X size={18} />
            </ActionButtonWithTooltip>
          </>
        )}

        {!isBulkEditEnabled && (
          <ActionButtonWithTooltip
            tooltip={t("actions.bulk_edit")}
            delayDuration={100}
            loading={false}
            variant="ghost"
            onClick={() => setIsBulkEditEnabled(true)}
          >
            <Pencil size={18} />
          </ActionButtonWithTooltip>
        )}
      </div>
    </div>
  );
}
