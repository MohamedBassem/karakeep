import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  GroupedSection,
  RowSeparator,
  SelectableRow,
} from "@/components/ui/GroupedList";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { useHeaderHeight } from "@react-navigation/elements";

import type { ZBookmarkList } from "@karakeep/shared/types/lists";
import {
  useAddBookmarkToList,
  useBookmarkLists,
  useRemoveBookmarkFromList,
} from "@karakeep/shared-react/hooks/lists";
import { useTRPC } from "@karakeep/shared-react/trpc";

const ListPickerPage = () => {
  const headerHeight = useHeaderHeight();
  const api = useTRPC();
  const { slug: bookmarkId } = useLocalSearchParams();
  const { colors } = useColorScheme();

  if (typeof bookmarkId !== "string") {
    throw new Error("Unexpected param type");
  }

  const { toast } = useToast();
  const onError = () => {
    toast({
      message: "Something went wrong",
      variant: "destructive",
      showProgress: false,
    });
  };

  const { data: existingLists } = useQuery(
    api.lists.getListsOfBookmark.queryOptions(
      { bookmarkId },
      {
        select: (data: { lists: ZBookmarkList[] }) =>
          new Set(data.lists.map((l) => l.id)),
      },
    ),
  );

  const { data } = useBookmarkLists();

  const {
    mutate: addToList,
    isPending: isAddingToList,
    variables: addVariables,
  } = useAddBookmarkToList({
    onSuccess: () => {
      toast({
        message: "Added to list!",
        showProgress: false,
      });
    },
    onError,
  });

  const {
    mutate: removeToList,
    isPending: isRemovingFromList,
    variables: removeVariables,
  } = useRemoveBookmarkFromList({
    onSuccess: () => {
      toast({
        message: "Removed from list!",
        showProgress: false,
      });
    },
    onError,
  });

  const toggleList = (listId: string) => {
    if (!existingLists) return;
    if (existingLists.has(listId)) {
      removeToList({ bookmarkId, listId });
    } else {
      addToList({ bookmarkId, listId });
    }
  };

  const isListLoading = (listId: string) => {
    return (
      (isAddingToList && addVariables?.listId === listId) ||
      (isRemovingFromList && removeVariables?.listId === listId)
    );
  };

  const { allPaths } = data ?? {};
  const filteredPaths = allPaths
    ?.filter((path) => path[path.length - 1].userRole !== "viewer")
    .filter((path) => path[path.length - 1].type !== "smart");

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: "Manage Lists",
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40 + headerHeight,
        }}
        style={[styles.flex1, { backgroundColor: colors.background }]}
      >
        {filteredPaths && filteredPaths.length > 0 ? (
          <GroupedSection>
            {filteredPaths.map((path, index) => {
              const listId = path[path.length - 1].id;
              return (
                <React.Fragment key={listId}>
                  {index > 0 && <RowSeparator />}
                  <SelectableRow
                    label={path
                      .map((item) => `${item.icon} ${item.name}`)
                      .join(" / ")}
                    selected={existingLists?.has(listId)}
                    loading={isListLoading(listId)}
                    onPress={() => toggleList(listId)}
                  />
                </React.Fragment>
              );
            })}
          </GroupedSection>
        ) : (
          <View style={styles.emptyState}>
            <Text color="tertiary">No lists available</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
};

export default ListPickerPage;

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
});
