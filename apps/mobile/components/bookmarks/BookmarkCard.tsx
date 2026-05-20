import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import useAppSettings from "@/lib/settings";
import { shareBookmark } from "@/lib/shareBookmark";
import { useMenuIconColors } from "@/lib/useMenuIconColors";
import { buildApiHeaders } from "@/lib/utils";
import { MenuView } from "@react-native-menu/menu";
import { useQuery } from "@tanstack/react-query";
import { Ellipsis, ShareIcon, Star } from "lucide-react-native";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import {
  useDeleteBookmark,
  useUpdateBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import { useWhoAmI } from "@karakeep/shared-react/hooks/users";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkLinkImageUrl,
  getBookmarkRefreshInterval,
  isBookmarkStillTagging,
} from "@karakeep/shared/utils/bookmarkUtils";

import { Divider } from "../ui/Divider";
import { Skeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import BookmarkAssetImage from "./BookmarkAssetImage";
import BookmarkTextMarkdown from "./BookmarkTextMarkdown";
import { NotePreview } from "./NotePreview";
import TagPill from "./TagPill";

function ActionBar({ bookmark }: { bookmark: ZBookmark }) {
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const { data: currentUser } = useWhoAmI();
  const { menuIconColor, destructiveMenuIconColor } = useMenuIconColors();

  // Check if the current user owns this bookmark
  const isOwner = currentUser?.id === bookmark.userId;

  const onError = () => {
    toast({
      message: "Something went wrong",
      variant: "destructive",
      showProgress: false,
    });
  };

  const { mutate: deleteBookmark, isPending: isDeletionPending } =
    useDeleteBookmark({
      onSuccess: () => {
        toast({
          message: "The bookmark has been deleted!",
          showProgress: false,
        });
      },
      onError,
    });

  const { mutate: favouriteBookmark, variables } = useUpdateBookmark({
    onError,
  });

  const { mutate: archiveBookmark, isPending: isArchivePending } =
    useUpdateBookmark({
      onSuccess: (resp) => {
        toast({
          message: `The bookmark has been ${resp.archived ? "archived" : "un-archived"}!`,
          showProgress: false,
        });
      },
      onError,
    });

  const deleteBookmarkAlert = () =>
    Alert.alert(
      "Delete bookmark?",
      "Are you sure you want to delete this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => deleteBookmark({ bookmarkId: bookmark.id }),
          style: "destructive",
        },
      ],
    );

  const handleShare = () => shareBookmark(bookmark, settings, toast);

  // Build actions array based on ownership
  const menuActions = [];
  if (isOwner) {
    menuActions.push(
      {
        id: "edit",
        title: "Edit",
        image: Platform.select({
          ios: "pencil",
        }),
        imageColor: Platform.select({
          ios: menuIconColor,
        }),
      },
      {
        id: "manage_list",
        title: "Manage Lists",
        image: Platform.select({
          ios: "list.bullet",
        }),
        imageColor: Platform.select({
          ios: menuIconColor,
        }),
      },
      {
        id: "manage_tags",
        title: "Manage Tags",
        image: Platform.select({
          ios: "tag",
        }),
        imageColor: Platform.select({
          ios: menuIconColor,
        }),
      },
      {
        id: "archive",
        title: bookmark.archived ? "Un-archive" : "Archive",
        image: Platform.select({
          ios: "folder",
        }),
        imageColor: Platform.select({
          ios: menuIconColor,
        }),
      },
      {
        id: "delete",
        title: "Delete",
        attributes: {
          destructive: true,
        },
        image: Platform.select({
          ios: "trash",
        }),
        imageColor: Platform.select({
          ios: destructiveMenuIconColor,
        }),
      },
    );
  }

  return (
    <View style={styles.actionBar}>
      {(isArchivePending || isDeletionPending) && <ActivityIndicator />}
      {isOwner && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            favouriteBookmark({
              bookmarkId: bookmark.id,
              favourited: !bookmark.favourited,
            });
          }}
        >
          {(variables ? variables.favourited : bookmark.favourited) ? (
            <Star fill="#ebb434" color="#ebb434" />
          ) : (
            <Star color="gray" />
          )}
        </Pressable>
      )}

      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          handleShare();
        }}
      >
        <ShareIcon color="gray" />
      </Pressable>

      {isOwner && menuActions.length > 0 && (
        <MenuView
          onPressAction={({ nativeEvent }) => {
            Haptics.selectionAsync();
            if (nativeEvent.event === "delete") {
              deleteBookmarkAlert();
            } else if (nativeEvent.event === "archive") {
              archiveBookmark({
                bookmarkId: bookmark.id,
                archived: !bookmark.archived,
              });
            } else if (nativeEvent.event === "manage_list") {
              router.push(`/dashboard/bookmarks/${bookmark.id}/manage_lists`);
            } else if (nativeEvent.event === "manage_tags") {
              router.push(`/dashboard/bookmarks/${bookmark.id}/manage_tags`);
            } else if (nativeEvent.event === "edit") {
              router.push(`/dashboard/bookmarks/${bookmark.id}/info`);
            }
          }}
          actions={menuActions}
          shouldOpenOnLongPress={false}
        >
          <Ellipsis onPress={() => Haptics.selectionAsync()} color="gray" />
        </MenuView>
      )}
    </View>
  );
}

function TagList({ bookmark }: { bookmark: ZBookmark }) {
  const tags = bookmark.tags;
  const { data: currentUser } = useWhoAmI();
  const isOwner = currentUser?.id === bookmark.userId;

  if (isBookmarkStillTagging(bookmark)) {
    return (
      <>
        <Skeleton style={styles.skeletonRow} />
        <Skeleton style={styles.skeletonRow} />
      </>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.tagRow}>
        {tags.map((t) => (
          <TagPill key={t.id} tag={t} clickable={isOwner} />
        ))}
      </View>
    </ScrollView>
  );
}

function LinkCard({
  bookmark,
  onOpenBookmark,
}: {
  bookmark: ZBookmark;
  onOpenBookmark: () => void;
}) {
  const { settings } = useAppSettings();
  const { data: currentUser } = useWhoAmI();
  const isOwner = currentUser?.id === bookmark.userId;

  if (bookmark.content.type !== BookmarkTypes.LINK) {
    throw new Error("Wrong content type rendered");
  }

  const note = settings.showNotes ? bookmark.note?.trim() : undefined;
  const url = bookmark.content.url;
  const parsedUrl = new URL(url);

  const imageUrl = getBookmarkLinkImageUrl(bookmark.content);

  let imageComp;
  if (imageUrl) {
    imageComp = (
      <View style={styles.linkImageWrap}>
        <Image
          source={
            imageUrl.localAsset
              ? {
                  uri: `${settings.address}${imageUrl.url}`,
                  headers: buildApiHeaders(
                    settings.apiKey,
                    settings.customHeaders,
                  ),
                }
              : {
                  uri: imageUrl.url,
                }
          }
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>
    );
  } else {
    imageComp = (
      <View style={styles.linkImageWrapRounded}>
        <Image
          // oxlint-disable-next-line no-require-imports
          source={require("@/assets/blur.jpeg")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.gap2}>
      <Pressable onPress={onOpenBookmark}>{imageComp}</Pressable>
      <View style={[styles.gap2, styles.p2]}>
        <Text
          style={styles.linkTitle}
          numberOfLines={2}
          onPress={onOpenBookmark}
        >
          {bookmark.title ?? bookmark.content.title ?? parsedUrl.host}
        </Text>
        {note && (
          <NotePreview
            note={note}
            bookmarkId={bookmark.id}
            readOnly={!isOwner}
          />
        )}
        <TagList bookmark={bookmark} />
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.linkFooter}>
          <Text style={styles.linkHost} numberOfLines={1}>
            {parsedUrl.host}
          </Text>
          <ActionBar bookmark={bookmark} />
        </View>
      </View>
    </View>
  );
}

function TextCard({
  bookmark,
  onOpenBookmark,
}: {
  bookmark: ZBookmark;
  onOpenBookmark: () => void;
}) {
  const { settings } = useAppSettings();
  const { data: currentUser } = useWhoAmI();
  const isOwner = currentUser?.id === bookmark.userId;

  if (bookmark.content.type !== BookmarkTypes.TEXT) {
    throw new Error("Wrong content type rendered");
  }
  const note = settings.showNotes ? bookmark.note?.trim() : undefined;
  const content = bookmark.content.text;
  return (
    <View style={styles.textCard}>
      <Pressable onPress={onOpenBookmark}>
        {bookmark.title && (
          <Text style={styles.cardTitle} numberOfLines={2}>
            {bookmark.title}
          </Text>
        )}
      </Pressable>
      <View style={styles.textCardBody}>
        <Pressable onPress={onOpenBookmark}>
          <BookmarkTextMarkdown text={content} />
        </Pressable>
      </View>
      {note && (
        <NotePreview note={note} bookmarkId={bookmark.id} readOnly={!isOwner} />
      )}
      <TagList bookmark={bookmark} />
      <Divider orientation="horizontal" style={styles.divider} />
      <View style={styles.textCardFooter}>
        <View />
        <ActionBar bookmark={bookmark} />
      </View>
    </View>
  );
}

function AssetCard({
  bookmark,
  onOpenBookmark,
}: {
  bookmark: ZBookmark;
  onOpenBookmark: () => void;
}) {
  const { settings } = useAppSettings();
  const { data: currentUser } = useWhoAmI();
  const isOwner = currentUser?.id === bookmark.userId;

  if (bookmark.content.type !== BookmarkTypes.ASSET) {
    throw new Error("Wrong content type rendered");
  }
  const note = settings.showNotes ? bookmark.note?.trim() : undefined;
  const title = bookmark.title ?? bookmark.content.fileName;

  const assetImage =
    bookmark.assets.find((r) => r.assetType == "assetScreenshot")?.id ??
    bookmark.content.assetId;

  return (
    <View style={styles.gap2}>
      <Pressable onPress={onOpenBookmark}>
        <BookmarkAssetImage assetId={assetImage} style={styles.assetImage} />
      </Pressable>
      <View style={[styles.gap2, styles.p2]}>
        <Pressable onPress={onOpenBookmark}>
          {title && (
            <Text numberOfLines={2} style={styles.cardTitle}>
              {title}
            </Text>
          )}
        </Pressable>
        {note && (
          <NotePreview
            note={note}
            bookmarkId={bookmark.id}
            readOnly={!isOwner}
          />
        )}
        <TagList bookmark={bookmark} />
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.linkFooter}>
          <View />
          <ActionBar bookmark={bookmark} />
        </View>
      </View>
    </View>
  );
}

export default function BookmarkCard({
  bookmark: initialData,
}: {
  bookmark: ZBookmark;
}) {
  const api = useTRPC();
  const { data: bookmark } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId: initialData.id,
      },
      {
        initialData,
        refetchInterval: (query) => {
          const data = query.state.data;
          if (!data) {
            return false;
          }
          return getBookmarkRefreshInterval(data);
        },
      },
    ),
  );

  const router = useRouter();
  const { settings } = useAppSettings();
  const { toast } = useToast();

  const onOpenBookmark = (bookmark: ZBookmark) => {
    if (
      bookmark.content.type === BookmarkTypes.LINK &&
      settings.defaultBookmarkView === "externalBrowser"
    ) {
      void Linking.openURL(bookmark.content.url).catch(() => {
        toast({
          message: "Failed to open link",
          variant: "destructive",
          showProgress: false,
        });

        router.push(`/dashboard/bookmarks/${bookmark.id}`);
      });
      return;
    }

    router.push(`/dashboard/bookmarks/${bookmark.id}`);
  };

  let comp;
  switch (bookmark.content.type) {
    case BookmarkTypes.LINK:
      comp = (
        <LinkCard
          bookmark={bookmark}
          onOpenBookmark={() => onOpenBookmark(bookmark)}
        />
      );
      break;
    case BookmarkTypes.TEXT:
      comp = (
        <TextCard
          bookmark={bookmark}
          onOpenBookmark={() => onOpenBookmark(bookmark)}
        />
      );
      break;
    case BookmarkTypes.ASSET:
      comp = (
        <AssetCard
          bookmark={bookmark}
          onOpenBookmark={() => onOpenBookmark(bookmark)}
        />
      );
      break;
  }

  return <BookmarkCardRoot>{comp}</BookmarkCardRoot>;
}

function BookmarkCardRoot({ children }: { children: React.ReactNode }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        styles.cardRoot,
        { backgroundColor: colors.card, borderCurve: "continuous" },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardRoot: {
    overflow: "hidden",
    borderRadius: 12,
  },
  actionBar: {
    flexDirection: "row",
    gap: 16,
  },
  skeletonRow: {
    height: 16,
    width: "100%",
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
  },
  gap2: {
    gap: 8,
  },
  p2: {
    padding: 8,
  },
  linkImageWrap: {
    height: 224,
    minHeight: 224,
    width: "100%",
  },
  linkImageWrapRounded: {
    height: 224,
    width: "100%",
    overflow: "hidden",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  linkTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  divider: {
    marginTop: 8,
    height: 2,
    width: "100%",
  },
  linkFooter: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  linkHost: {
    flexShrink: 1,
  },
  textCard: {
    maxHeight: 384,
    gap: 8,
    padding: 8,
  },
  textCardBody: {
    maxHeight: 224,
    overflow: "hidden",
    padding: 8,
  },
  textCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  assetImage: {
    height: 224,
    minHeight: 224,
    width: "100%",
  },
});
