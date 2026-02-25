import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import FullPageError from "@/components/FullPageError";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { GroupedSection } from "@/components/ui/GroupedList";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";
import { useQuery } from "@tanstack/react-query";

import { useDeleteTag, useUpdateTag } from "@karakeep/shared-react/hooks/tags";
import { useTRPC } from "@karakeep/shared-react/trpc";

export default function EditTagPage() {
  const { slug } = useLocalSearchParams();
  const { toast } = useToast();
  const { colors } = useColorScheme();
  const api = useTRPC();

  if (typeof slug !== "string") {
    throw new Error("Unexpected param type");
  }

  const [editedName, setEditedName] = React.useState<string | null>(null);

  const {
    data: tag,
    isPending: isLoadingTag,
    refetch,
  } = useQuery(api.tags.get.queryOptions({ tagId: slug }));

  const hasChanges = editedName !== null && editedName !== tag?.name;

  const { mutate: updateTag, isPending: isUpdatePending } = useUpdateTag({
    onSuccess: () => {
      toast({ message: "Tag updated!", showProgress: false });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("dashboard");
      }
    },
    onError: (error) => {
      let errorMessage = "Failed to update tag";
      if (error.data?.zodError) {
        errorMessage = Object.values(error.data.zodError.fieldErrors)
          .flat()
          .join("\n");
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ message: errorMessage, showProgress: false });
    },
  });

  const { mutate: deleteTag, isPending: isDeletionPending } = useDeleteTag({
    onSuccess: () => {
      router.replace("/dashboard/(tabs)/(tags)");
      toast({ message: "Tag deleted!", showProgress: false });
    },
    onError: () => {
      toast({ message: "Failed to delete tag", showProgress: false });
    },
  });

  const onDone = () => {
    if (hasChanges) {
      const trimmed = editedName.trim();
      if (!trimmed) {
        toast({ message: "Tag name can't be empty", showProgress: false });
        return;
      }
      updateTag({ tagId: slug, name: trimmed });
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("dashboard");
      }
    }
  };

  const handleDeleteTag = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Tag", "Are you sure you want to delete this tag?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: () => deleteTag({ tagId: slug }),
        style: "destructive",
      },
    ]);
  };

  if (isLoadingTag) {
    return <FullPageSpinner />;
  }

  if (!tag) {
    return <FullPageError error="Tag not found" onRetry={() => refetch()} />;
  }

  return (
    <KeyboardGestureArea interpolator="ios">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: "Edit Tag",
          headerRight: () => (
            <Pressable onPress={onDone} disabled={isUpdatePending}>
              {isUpdatePending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  className={
                    hasChanges ? "font-semibold text-primary" : "text-primary"
                  }
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
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        className="bg-background"
      >
        <GroupedSection header="Name">
          <TextInput
            editable={!isUpdatePending}
            placeholder="Tag name"
            placeholderTextColor={colors.grey}
            onChangeText={(text) => setEditedName(text)}
            defaultValue={tag.name}
            autoFocus
            className="px-4 py-3 text-[17px] leading-6 text-foreground"
          />
        </GroupedSection>
        <GroupedSection>
          <Pressable
            onPress={handleDeleteTag}
            disabled={isDeletionPending}
            className="items-center px-4 py-3 active:opacity-70"
          >
            <Text className="text-destructive">
              {isDeletionPending ? "Deleting..." : "Delete Tag"}
            </Text>
          </Pressable>
        </GroupedSection>
      </KeyboardAwareScrollView>
    </KeyboardGestureArea>
  );
}
