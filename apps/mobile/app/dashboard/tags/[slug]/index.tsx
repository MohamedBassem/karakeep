import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import UpdatingBookmarkList from "@/components/bookmarks/UpdatingBookmarkList";
import FullPageError from "@/components/FullPageError";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useArchiveFilter } from "@/lib/hooks";
import { MenuView } from "@react-native-menu/menu";
import { useQuery } from "@tanstack/react-query";
import { Ellipsis } from "lucide-react-native";

import { useDeleteTag } from "@karakeep/shared-react/hooks/tags";
import { useTRPC } from "@karakeep/shared-react/trpc";

function TagActionsMenu({ tagId }: { tagId: string }) {
  const { mutate: deleteTag } = useDeleteTag({
    onSuccess: () => {
      router.replace("/dashboard/(tabs)/(tags)");
    },
  });

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Tag", "Are you sure you want to delete this tag?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: () => {
          deleteTag({ tagId });
        },
        style: "destructive",
      },
    ]);
  };

  const handleEdit = () => {
    router.push({
      pathname: "/dashboard/tags/[slug]/edit",
      params: { slug: tagId },
    });
  };

  return (
    <MenuView
      actions={[
        {
          id: "edit",
          title: "Edit Tag",
        },
        {
          id: "delete",
          title: "Delete Tag",
          attributes: {
            destructive: true,
          },
          image: Platform.select({
            ios: "trash",
          }),
        },
      ]}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === "delete") {
          handleDelete();
        } else if (nativeEvent.event === "edit") {
          handleEdit();
        }
      }}
      shouldOpenOnLongPress={false}
    >
      <Ellipsis onPress={() => Haptics.selectionAsync()} color="gray" />
    </MenuView>
  );
}

export default function TagView() {
  const { slug } = useLocalSearchParams();
  const api = useTRPC();
  if (typeof slug !== "string") {
    throw new Error("Unexpected param type");
  }

  const {
    data: tag,
    error,
    refetch,
  } = useQuery(api.tags.get.queryOptions({ tagId: slug }));
  const { archived, isLoading: isSettingsLoading } = useArchiveFilter();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: tag?.name ?? "",
          headerBackTitle: "Back",
          headerRight: () => <TagActionsMenu tagId={slug} />,
        }}
      />
      {error ? (
        <FullPageError error={error.message} onRetry={() => refetch()} />
      ) : tag && !isSettingsLoading ? (
        <UpdatingBookmarkList
          query={{
            tagId: tag.id,
            archived,
          }}
        />
      ) : (
        <FullPageSpinner />
      )}
    </>
  );
}
