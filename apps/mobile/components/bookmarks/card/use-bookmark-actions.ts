import { useOfflineAvailability } from "@/components/bookmarks/useOfflineAvailability";
import { useClientConfig } from "@/lib/client-config";
import { getBookmarkDisplayTitle } from "@/lib/bookmarkDisplay";
import useAppSettings from "@/lib/settings";
import { shareBookmark } from "@/lib/shareBookmark";
import { useMenuIconColors } from "@/lib/useMenuIconColors";
import type { MenuAction } from "@react-native-menu/menu";
import { router } from "expo-router";
import { Alert, Platform } from "react-native";

import { useBookmarkListContext } from "@karakeep/shared-react/hooks/bookmark-list-context";
import {
  useDeleteBookmark,
  usePreserveBookmarkVideo,
  usePreserveOfflineCopy,
  useRecrawlBookmark,
  useUpdateBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import {
  useAddBookmarkToList,
  useRemoveBookmarkFromList,
} from "@karakeep/shared-react/hooks/lists";
import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import {
  useCommonActions,
  useCommonStrings,
  useTranslation,
} from "@/lib/i18n/hooks";
import { showUndoToast, useToast } from "../../ui/Toast";

export interface BookmarkActionController {
  isOwner: boolean;
  isBusy: boolean;
  isFavourited: boolean;
  menuActions: MenuAction[];
  /** The overflow actions, plus the ones the card row doesn't show. */
  contextMenuActions: MenuAction[];
  handleAction: (actionId: string) => void;
  share: () => void;
  toggleFavourite: () => void;
  isArchived: boolean;
  isAvailableOffline: boolean;
  toggleArchived: () => void;
}

export function useBookmarkActions(
  bookmark: ZBookmark,
  isOwner: boolean,
): BookmarkActionController {
  const { toast } = useToast();
  const { t } = useTranslation();
  const actions = useCommonActions();
  const strings = useCommonStrings();
  const { settings } = useAppSettings();
  const { menuIconColor, destructiveMenuIconColor } = useMenuIconColors();
  const offlineAvailability = useOfflineAvailability(bookmark.id);
  const clientConfig = useClientConfig();
  // Set when the card's shown inside a list
  const list = useBookmarkListContext();
  const supportsOfflineReading =
    bookmark.content.type === BookmarkTypes.LINK ||
    bookmark.content.type === BookmarkTypes.TEXT;

  const onError = () => {
    toast({
      message: strings.somethingWentWrong,
      variant: "destructive",
      showProgress: false,
    });
  };

  const { mutate: deleteBookmark, isPending: isDeletionPending } =
    useDeleteBookmark({
      onSuccess: () => {
        toast({
          message: t("bookmark_actions.bookmark_deleted"),
          variant: "success",
          showProgress: false,
        });
      },
      onError,
    });

  const { mutate: favouriteBookmark, variables } = useUpdateBookmark({
    onError,
  });

  // Undo only flips the flag back: no second undo toast.
  const { mutate: undoArchive } = useUpdateBookmark({ onError });

  const { mutate: archiveBookmark, isPending: isArchivePending } =
    useUpdateBookmark({
      onSuccess: (response) => {
        showUndoToast(
          response.archived
            ? t("bookmarks.archived")
            : t("bookmark_actions.moved_out_of_archive"),
          () =>
            undoArchive({
              bookmarkId: bookmark.id,
              archived: !response.archived,
            }),
        );
      },
      onError,
    });

  const { mutate: recrawlBookmark, isPending: isRecrawlPending } =
    useRecrawlBookmark({
      onSuccess: () => {
        toast({
          message: t("bookmark_actions.recrawl_queued"),
          showProgress: false,
        });
      },
      onError,
    });

  const { mutate: saveCopy } = usePreserveOfflineCopy({
    onSuccess: (_res, req) => {
      toast({
        message:
          req.kind === "pdf"
            ? t("bookmark_actions.saving_pdf")
            : t("bookmark_actions.saving_copy"),
        showProgress: false,
      });
    },
    onError,
  });

  const { mutate: saveVideo } = usePreserveBookmarkVideo({
    onSuccess: () => {
      toast({
        message: t("bookmark_actions.video_queued"),
        showProgress: false,
      });
    },
    onError,
  });

  // Undo puts it back without another undo toast
  const { mutate: addToList } = useAddBookmarkToList({ onError });

  const { mutate: removeFromList } = useRemoveBookmarkFromList({
    onSuccess: (_res, req) => {
      // Only a bookmark's owner can add it to a list, so editors removing
      // someone else's bookmark get no undo
      if (!isOwner) {
        toast({
          message: t("bookmark_actions.removed_from_list"),
          showProgress: false,
        });
        return;
      }
      showUndoToast(t("bookmark_actions.removed_from_list"), () =>
        addToList(req),
      );
    },
    onError,
  });

  const isFavourited = Boolean(
    variables ? variables.favourited : bookmark.favourited,
  );

  const toggleFavourite = () => {
    favouriteBookmark({
      bookmarkId: bookmark.id,
      favourited: !bookmark.favourited,
    });
  };

  const share = () => shareBookmark(bookmark, settings, toast);

  const deleteBookmarkAlert = () =>
    Alert.alert(
      t("bookmark_actions.delete_named_title", {
        title: getBookmarkDisplayTitle(bookmark),
      }),
      t("bookmark_actions.delete_named_message"),
      [
        { text: actions.cancel, style: "cancel" },
        {
          text: t("bookmark_actions.delete"),
          onPress: () => deleteBookmark({ bookmarkId: bookmark.id }),
          style: "destructive",
        },
      ],
    );

  const isOwnLink = isOwner && bookmark.content.type === BookmarkTypes.LINK;
  const canRemoveFromList =
    list?.type === "manual" &&
    (list.userRole === "owner" || list.userRole === "editor");
  // It's the first thing to try on a page that couldn't be fetched
  const hasCrawlFailed =
    bookmark.content.type === BookmarkTypes.LINK &&
    bookmark.content.crawlStatus === "failure";
  const recrawlAction: MenuAction = {
    id: "recrawl",
    title: t("bookmark_actions.recrawl"),
    image: Platform.select({ ios: "arrow.clockwise" }),
    imageColor: Platform.select({ ios: menuIconColor }),
    attributes: {
      ...(isRecrawlPending && { disabled: true }),
    },
  };

  const menuActions: MenuAction[] = [];
  if (isOwnLink && hasCrawlFailed) {
    menuActions.push(recrawlAction);
  }
  if (isOwner) {
    menuActions.push(
      {
        id: "edit",
        title: t("bookmark_actions.edit_details"),
        image: Platform.select({ ios: "pencil" }),
        imageColor: Platform.select({ ios: menuIconColor }),
      },
      {
        id: "manage_list",
        title: t("bookmark_actions.manage_lists"),
        image: Platform.select({ ios: "list.bullet" }),
        imageColor: Platform.select({ ios: menuIconColor }),
      },
      {
        id: "manage_tags",
        title: t("bookmark_actions.manage_tags"),
        image: Platform.select({ ios: "tag" }),
        imageColor: Platform.select({ ios: menuIconColor }),
      },
      {
        id: "archive",
        title: bookmark.archived
          ? t("bookmark_actions.move_out_of_archive")
          : t("bookmark_actions.archive"),
        image: Platform.select({ ios: "archivebox" }),
        imageColor: Platform.select({ ios: menuIconColor }),
      },
    );
  }

  // The list's editors can take out anyone's bookmark, not just their own
  if (canRemoveFromList) {
    menuActions.push({
      id: "remove-from-list",
      title: t("bookmark_actions.remove_from_list"),
      image: Platform.select({ ios: "text.badge.minus" }),
      imageColor: Platform.select({ ios: menuIconColor }),
    });
  }

  if (supportsOfflineReading) {
    if (offlineAvailability.isAvailableOffline) {
      menuActions.push({
        id: "offline-group",
        title: t("bookmark_actions.downloaded"),
        image: Platform.select({ ios: "checkmark.circle" }),
        imageColor: Platform.select({ ios: menuIconColor }),
        subactions: [
          {
            id: "update-offline-copy",
            title: offlineAvailability.isSaving
              ? t("bookmark_actions.downloading")
              : t("bookmark_actions.update_download"),
            image: Platform.select({ ios: "arrow.clockwise" }),
            imageColor: Platform.select({ ios: menuIconColor }),
            attributes: {
              ...(offlineAvailability.isSaving && { disabled: true }),
            },
          },
          {
            id: "remove-offline-copy",
            title: t("bookmark_actions.remove_download"),
            attributes: { destructive: true },
            image: Platform.select({ ios: "trash" }),
            imageColor: Platform.select({ ios: destructiveMenuIconColor }),
          },
        ],
      });
    } else {
      menuActions.push({
        id: "make-available-offline",
        title: offlineAvailability.isSaving
          ? t("bookmark_actions.downloading")
          : t("bookmark_actions.download"),
        image: Platform.select({ ios: "arrow.down.circle" }),
        imageColor: Platform.select({ ios: menuIconColor }),
        attributes: {
          ...(offlineAvailability.isSaving && { disabled: true }),
        },
      });
    }
  }

  // Kept on the server, unlike the download for reading offline on the phone
  if (isOwnLink) {
    menuActions.push({
      id: "saved-copies",
      title: t("bookmark_actions.saved_copies"),
      image: Platform.select({ ios: "square.and.arrow.down.on.square" }),
      imageColor: Platform.select({ ios: menuIconColor }),
      subactions: [
        {
          id: "save-copy",
          title: t("bookmark_actions.save_copy"),
          image: Platform.select({ ios: "doc.richtext" }),
          imageColor: Platform.select({ ios: menuIconColor }),
        },
        {
          id: "save-pdf",
          title: t("bookmark_actions.save_pdf"),
          image: Platform.select({ ios: "doc.text" }),
          imageColor: Platform.select({ ios: menuIconColor }),
        },
        ...(clientConfig.crawler.videoDownloadOnDemand
          ? [
              {
                id: "save-video",
                title: t("bookmark_actions.save_video"),
                image: Platform.select({ ios: "film" }),
                imageColor: Platform.select({ ios: menuIconColor }),
              },
            ]
          : []),
      ],
    });
  }

  if (isOwnLink && !hasCrawlFailed) {
    menuActions.push(recrawlAction);
  }

  if (isOwner) {
    menuActions.push({
      id: "delete",
      title: t("bookmark_actions.delete"),
      attributes: { destructive: true },
      image: Platform.select({ ios: "trash" }),
      imageColor: Platform.select({ ios: destructiveMenuIconColor }),
    });
  }

  const contextMenuActions: MenuAction[] = [
    ...(isOwner
      ? [
          {
            id: "toggle-favourite",
            title: isFavourited
              ? t("bookmark_actions.remove_from_favourites")
              : t("bookmark_actions.add_to_favourites"),
            image: Platform.select({
              ios: isFavourited ? "star.fill" : "star",
            }),
            imageColor: Platform.select({ ios: menuIconColor }),
          },
        ]
      : []),
    {
      id: "share",
      title: t("bookmark_actions.share"),
      image: Platform.select({ ios: "square.and.arrow.up" }),
      imageColor: Platform.select({ ios: menuIconColor }),
    },
    ...menuActions,
  ];

  const handleAction = (actionId: string) => {
    if (actionId === "toggle-favourite") {
      toggleFavourite();
    } else if (actionId === "share") {
      share();
    } else if (
      actionId === "make-available-offline" ||
      actionId === "update-offline-copy"
    ) {
      void offlineAvailability.save();
    } else if (actionId === "save-copy") {
      saveCopy({ bookmarkId: bookmark.id, kind: "fullPageArchive" });
    } else if (actionId === "save-pdf") {
      saveCopy({ bookmarkId: bookmark.id, kind: "pdf" });
    } else if (actionId === "save-video") {
      saveVideo({ bookmarkId: bookmark.id });
    } else if (actionId === "remove-from-list" && list) {
      removeFromList({ listId: list.id, bookmarkId: bookmark.id });
    } else if (actionId === "recrawl") {
      recrawlBookmark({ bookmarkId: bookmark.id });
    } else if (actionId === "remove-offline-copy") {
      offlineAvailability.confirmRemove();
    } else if (actionId === "delete") {
      deleteBookmarkAlert();
    } else if (actionId === "archive") {
      archiveBookmark({
        bookmarkId: bookmark.id,
        archived: !bookmark.archived,
      });
    } else if (actionId === "manage_list") {
      router.push(`/dashboard/bookmarks/${bookmark.id}/manage_lists`);
    } else if (actionId === "manage_tags") {
      router.push(`/dashboard/bookmarks/${bookmark.id}/manage_tags`);
    } else if (actionId === "edit") {
      router.push(`/dashboard/bookmarks/${bookmark.id}/info`);
    }
  };

  return {
    isOwner,
    isBusy: isArchivePending || isDeletionPending,
    isFavourited,
    menuActions,
    contextMenuActions,
    handleAction,
    share,
    toggleFavourite,
    isArchived: bookmark.archived,
    isAvailableOffline: offlineAvailability.isAvailableOffline,
    toggleArchived: () =>
      archiveBookmark({
        bookmarkId: bookmark.id,
        archived: !bookmark.archived,
      }),
  };
}
