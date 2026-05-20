import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import BookmarkTextMarkdown from "@/components/bookmarks/BookmarkTextMarkdown";
import TagPill from "@/components/bookmarks/TagPill";
import FullPageError from "@/components/FullPageError";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import {
  GroupedSection,
  NavigationRow,
  RowSeparator,
} from "@/components/ui/GroupedList";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";
import { ChevronUp, RefreshCw, Sparkles, Trash2 } from "lucide-react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import {
  useAutoRefreshingBookmarkQuery,
  useDeleteBookmark,
  useSummarizeBookmark,
  useUpdateBookmark,
} from "@karakeep/shared-react/hooks/bookmarks";
import { useWhoAmI } from "@karakeep/shared-react/hooks/users";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";
import { isBookmarkStillTagging } from "@karakeep/shared/utils/bookmarkUtils";

// --- Section Components ---

function TitleEditor({
  title,
  setTitle,
  isPending,
  disabled,
}: {
  title: string | null | undefined;
  setTitle: (title: string | null) => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  const { colors } = useColorScheme();
  return (
    <GroupedSection header="Title">
      <TextInput
        editable={!isPending && !disabled}
        placeholder="Untitled"
        placeholderTextColor={colors.grey}
        onChangeText={(text) => setTitle(text)}
        defaultValue={title ?? ""}
        style={[styles.titleInput, { color: colors.foreground }]}
      />
    </GroupedSection>
  );
}

function NotesEditor({
  notes,
  setNotes,
  isPending,
  disabled,
}: {
  notes: string | null | undefined;
  setNotes: (note: string | null) => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  const { colors } = useColorScheme();
  return (
    <GroupedSection header="Notes">
      <TextInput
        editable={!isPending && !disabled}
        multiline
        placeholder="Add notes..."
        placeholderTextColor={colors.grey}
        onChangeText={(text) => setNotes(text)}
        textAlignVertical="top"
        defaultValue={notes ?? ""}
        style={[styles.notesInput, { color: colors.foreground }]}
      />
    </GroupedSection>
  );
}

function TagList({
  bookmark,
  readOnly,
}: {
  bookmark: ZBookmark;
  readOnly: boolean;
}) {
  const hasTags = bookmark.tags.length > 0;
  const isTagging = isBookmarkStillTagging(bookmark);

  if (!isTagging && !hasTags && readOnly) {
    return null;
  }

  return (
    <GroupedSection header="Tags">
      {isTagging ? (
        <View style={styles.taggingSkeletons}>
          <Skeleton style={styles.skeletonFull} />
          <Skeleton style={styles.skeletonPartial} />
        </View>
      ) : (
        hasTags && (
          <>
            <View style={styles.tagsWrap}>
              {bookmark.tags.map((t) => (
                <TagPill key={t.id} tag={t} clickable={!readOnly} />
              ))}
            </View>
            {!readOnly && <RowSeparator />}
          </>
        )
      )}
      {!readOnly && (
        <NavigationRow
          label="Manage Tags"
          onPress={() =>
            router.push(`/dashboard/bookmarks/${bookmark.id}/manage_tags`)
          }
        />
      )}
    </GroupedSection>
  );
}

function ManageLists({ bookmark }: { bookmark: ZBookmark }) {
  return (
    <GroupedSection header="Lists">
      <NavigationRow
        label="Manage Lists"
        onPress={() =>
          router.push(`/dashboard/bookmarks/${bookmark.id}/manage_lists`)
        }
      />
    </GroupedSection>
  );
}

function AISummarySection({
  bookmark,
  readOnly,
}: {
  bookmark: ZBookmark;
  readOnly: boolean;
}) {
  const { toast } = useToast();
  const { colors } = useColorScheme();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const { mutate: summarize, isPending: isSummarizing } = useSummarizeBookmark({
    onSuccess: () => {
      toast({ message: "Summary generated!", showProgress: false });
    },
    onError: () => {
      toast({
        message: "Failed to generate summary",
        showProgress: false,
      });
    },
  });

  const { mutate: resummarize, isPending: isResummarizing } =
    useSummarizeBookmark({
      onSuccess: () => {
        toast({ message: "Summary regenerated!", showProgress: false });
      },
      onError: () => {
        toast({
          message: "Failed to regenerate summary",
          showProgress: false,
        });
      },
    });

  const { mutate: updateBookmark, isPending: isDeletingSummary } =
    useUpdateBookmark({
      onSuccess: () => {
        toast({ message: "Summary deleted!", showProgress: false });
      },
      onError: () => {
        toast({
          message: "Failed to delete summary",
          showProgress: false,
        });
      },
    });

  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return null;
  }

  if (bookmark.summary) {
    return (
      <GroupedSection header="AI Summary">
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.summaryWrapper}
        >
          <View style={isExpanded ? undefined : styles.summaryCollapsed}>
            <BookmarkTextMarkdown text={bookmark.summary} />
          </View>
          {!isExpanded && (
            <Text
              variant="footnote"
              style={[styles.showMore, { color: colors.primary }]}
            >
              Show more
            </Text>
          )}
        </Pressable>
        {isExpanded && !readOnly && (
          <>
            <RowSeparator />
            <View style={styles.summaryActions}>
              <Pressable
                onPress={() => resummarize({ bookmarkId: bookmark.id })}
                disabled={isResummarizing}
                style={({ pressed }) => [
                  styles.summaryActionButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {isResummarizing ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <RefreshCw size={18} color={colors.grey} />
                )}
              </Pressable>
              <Pressable
                onPress={() =>
                  updateBookmark({ bookmarkId: bookmark.id, summary: null })
                }
                disabled={isDeletingSummary}
                style={({ pressed }) => [
                  styles.summaryActionButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {isDeletingSummary ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Trash2 size={18} color={colors.grey} />
                )}
              </Pressable>
              <Pressable
                onPress={() => setIsExpanded(false)}
                style={({ pressed }) => [
                  styles.summaryActionButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ChevronUp size={18} color={colors.grey} />
              </Pressable>
            </View>
          </>
        )}
      </GroupedSection>
    );
  }

  if (readOnly) {
    return null;
  }

  return (
    <GroupedSection>
      <Pressable
        onPress={() => summarize({ bookmarkId: bookmark.id })}
        disabled={isSummarizing}
        style={({ pressed }) => [
          styles.summarizeButton,
          pressed && { opacity: 0.7 },
        ]}
      >
        {isSummarizing ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.primary }}>Generating...</Text>
          </>
        ) : (
          <>
            <Sparkles size={16} color={colors.primary} />
            <Text style={{ color: colors.primary }}>Summarize with AI</Text>
          </>
        )}
      </Pressable>
    </GroupedSection>
  );
}

// --- Main Page ---

const ViewBookmarkPage = () => {
  const headerHeight = useHeaderHeight();
  const { slug } = useLocalSearchParams();
  const { toast } = useToast();
  const { colors } = useColorScheme();
  const { data: currentUser } = useWhoAmI();
  if (typeof slug !== "string") {
    throw new Error("Unexpected param type");
  }

  const [editedBookmark, setEditedBookmark] = React.useState<{
    title?: string | null;
    note?: string;
  }>({});

  const hasChanges = Object.keys(editedBookmark).length > 0;

  const { mutate: editBookmark, isPending: isEditPending } = useUpdateBookmark({
    onSuccess: () => {
      toast({ message: "Bookmark updated!", showProgress: false });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("dashboard");
      }
    },
    onError: () => {
      toast({ message: "Failed to save changes", showProgress: false });
    },
  });

  const { mutate: deleteBookmark, isPending: isDeletionPending } =
    useDeleteBookmark({
      onSuccess: () => {
        router.replace("dashboard");
        toast({ message: "Bookmark deleted!", showProgress: false });
      },
    });

  const {
    data: bookmark,
    isPending,
    refetch,
  } = useAutoRefreshingBookmarkQuery({
    bookmarkId: slug,
  });

  const isOwner = currentUser?.id === bookmark?.userId;

  const onDone = () => {
    const dismiss = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("dashboard");
      }
    };

    if (hasChanges && bookmark) {
      editBookmark({ bookmarkId: bookmark.id, ...editedBookmark });
    } else {
      dismiss();
    }
  };

  if (isPending) {
    return <FullPageSpinner />;
  }

  if (!bookmark) {
    return (
      <FullPageError error="Bookmark not found" onRetry={() => refetch()} />
    );
  }

  const handleDeleteBookmark = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Bookmark",
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
  };

  let title: string | null = null;
  switch (bookmark.content.type) {
    case BookmarkTypes.LINK:
      title = bookmark.title ?? bookmark.content.title ?? null;
      break;
    case BookmarkTypes.TEXT:
      title = bookmark.title ?? null;
      break;
    case BookmarkTypes.ASSET:
      title = bookmark.title ?? bookmark.content.fileName ?? null;
      break;
  }

  return (
    <KeyboardGestureArea interpolator="ios">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: "Edit Bookmark",
          headerRight: () => (
            <Pressable
              onPress={onDone}
              disabled={isEditPending}
              style={styles.headerRightButton}
            >
              {isEditPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  style={[
                    { color: colors.primary },
                    hasChanges && styles.boldText,
                  ]}
                >
                  {hasChanges ? "Save" : "Done"}
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={8}
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          padding: 16,
          gap: 20,
          paddingBottom: 40 + headerHeight,
        }}
        style={{ backgroundColor: colors.background }}
      >
        <TitleEditor
          title={title}
          setTitle={(t) => setEditedBookmark((prev) => ({ ...prev, title: t }))}
          isPending={isEditPending}
          disabled={!isOwner}
        />
        <AISummarySection bookmark={bookmark} readOnly={!isOwner} />
        <TagList bookmark={bookmark} readOnly={!isOwner} />
        {isOwner && <ManageLists bookmark={bookmark} />}
        <NotesEditor
          notes={bookmark.note}
          setNotes={(note) =>
            setEditedBookmark((prev) => ({ ...prev, note: note ?? "" }))
          }
          isPending={isEditPending}
          disabled={!isOwner}
        />
        {isOwner && (
          <GroupedSection>
            <Pressable
              onPress={handleDeleteBookmark}
              disabled={isDeletionPending}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ color: colors.destructive }} numberOfLines={1}>
                {isDeletionPending ? "Deleting..." : "Delete Bookmark"}
              </Text>
            </Pressable>
          </GroupedSection>
        )}
        <View style={styles.timestampGroup}>
          <Text variant="caption1" color="tertiary" selectable>
            Created {bookmark.createdAt.toLocaleString()}
          </Text>
          {bookmark.modifiedAt &&
            bookmark.modifiedAt.getTime() !== bookmark.createdAt.getTime() && (
              <Text variant="caption1" color="tertiary" selectable>
                Modified {bookmark.modifiedAt.toLocaleString()}
              </Text>
            )}
        </View>
      </KeyboardAwareScrollView>
    </KeyboardGestureArea>
  );
};

export default ViewBookmarkPage;

const styles = StyleSheet.create({
  titleInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    lineHeight: 24,
  },
  notesInput: {
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    lineHeight: 24,
  },
  taggingSkeletons: {
    gap: 12,
    padding: 16,
  },
  skeletonFull: {
    height: 16,
    width: "100%",
  },
  skeletonPartial: {
    height: 16,
    width: "75%",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCollapsed: {
    maxHeight: 64,
    overflow: "hidden",
  },
  showMore: {
    marginTop: 6,
  },
  summaryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  summaryActionButton: {
    borderRadius: 9999,
    padding: 10,
  },
  summarizeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRightButton: {
    paddingHorizontal: 8,
  },
  boldText: {
    fontWeight: "600",
  },
  deleteButton: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timestampGroup: {
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
});
