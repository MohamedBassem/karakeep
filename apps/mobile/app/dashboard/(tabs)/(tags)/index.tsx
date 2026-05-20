import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import FullPageError from "@/components/FullPageError";
import ChevronRight from "@/components/ui/ChevronRight";
import EmptyState from "@/components/ui/EmptyState";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { SearchInput } from "@/components/ui/SearchInput";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useQueryClient } from "@tanstack/react-query";
import { Tag } from "lucide-react-native";

import { usePaginatedSearchTags } from "@karakeep/shared-react/hooks/tags";
import { useDebounce } from "@karakeep/shared-react/hooks/use-debounce";
import { useTRPC } from "@karakeep/shared-react/trpc";

interface TagItem {
  id: string;
  name: string;
  numBookmarks: number;
  href: string;
}

export default function Tags() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { colors } = useColorScheme();
  const api = useTRPC();
  const queryClient = useQueryClient();

  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch tags sorted by usage (most used first)
  const {
    data,
    isPending,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePaginatedSearchTags({
    limit: 50,
    sortBy: debouncedSearch ? "relevance" : "usage",
    nameContains: debouncedSearch,
  });

  useEffect(() => {
    setRefreshing(isPending);
  }, [isPending]);

  if (error) {
    return <FullPageError error={error.message} onRetry={() => refetch()} />;
  }

  if (!data) {
    return <FullPageSpinner />;
  }

  const onRefresh = () => {
    queryClient.invalidateQueries(api.tags.list.pathFilter());
  };

  const tags: TagItem[] = data.tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    numBookmarks: tag.numBookmarks,
    href: `/dashboard/tags/${tag.id}`,
  }));

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <FlatList
      style={styles.fullHeight}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={
        <SearchInput
          containerStyle={styles.searchContainer}
          placeholder="Search tags..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      }
      contentContainerStyle={{
        gap: 6,
        paddingBottom: 20,
      }}
      renderItem={(item) => (
        <View
          style={[
            styles.itemRow,
            { backgroundColor: colors.card, borderCurve: "continuous" },
          ]}
        >
          <Link
            asChild
            key={item.item.id}
            href={item.item.href}
            style={styles.flex1}
          >
            <Pressable style={styles.itemPressable}>
              <View style={styles.flex1}>
                <Text style={styles.tagName}>{item.item.name}</Text>
                <Text
                  style={[styles.tagCount, { color: colors.mutedForeground }]}
                >
                  {item.item.numBookmarks}{" "}
                  {item.item.numBookmarks === 1 ? "bookmark" : "bookmarks"}
                </Text>
              </View>
              <ChevronRight />
            </Pressable>
          </Link>
        </View>
      )}
      data={tags}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoading}>
            <Text
              style={[styles.footerText, { color: colors.mutedForeground }]}
            >
              Loading more...
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !isPending ? (
          <EmptyState
            icon={Tag}
            title="No Tags"
            subtitle="Tags will appear as you organize your bookmarks"
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  fullHeight: {
    height: "100%",
  },
  searchContainer: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  itemRow: {
    marginHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flex1: {
    flex: 1,
  },
  itemPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagName: {
    fontWeight: "500",
  },
  tagCount: {
    fontSize: 14,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  footerText: {
    textAlign: "center",
  },
});
