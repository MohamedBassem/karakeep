import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import BookmarkList from "@/components/bookmarks/BookmarkList";
import FullPageError from "@/components/FullPageError";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Text } from "@/components/ui/Text";

import type { BookmarkSearchState } from "@/lib/useBookmarkSearchState";

interface BookmarkSearchResultsProps {
  rawSearch: string;
  isInputFocused: boolean;
  state: BookmarkSearchState;
  onSelectHistory: (term: string) => void;
}

export default function BookmarkSearchResults({
  rawSearch,
  state,
  onSelectHistory,
}: BookmarkSearchResultsProps) {
  const { colors } = useColorScheme();
  const {
    history,
    filteredHistory,
    clearHistory,
    data,
    error,
    refetch,
    isPending,
    fetchNextPage,
    isFetchingNextPage,
    onRefresh,
  } = state;

  if (error) {
    return <FullPageError error={error.message} onRetry={() => refetch()} />;
  }

  const renderHistoryItem = ({ item }: { item: string }) => (
    <Pressable
      onPress={() => onSelectHistory(item)}
      style={[styles.historyItem, { borderBottomColor: colors.border }]}
    >
      <Text style={{ color: colors.foreground }}>{item}</Text>
    </Pressable>
  );

  if (rawSearch.trim().length === 0) {
    return (
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={filteredHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) => `${item}-${index}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Recent Searches</Text>
            {history.length > 0 && (
              <Pressable onPress={clearHistory}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No recent searches</Text>
        }
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  if (isPending) {
    return <FullPageSpinner />;
  }

  if (data) {
    return (
      <BookmarkList
        bookmarks={data.pages.flatMap((p) => p.bookmarks)}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onRefresh={onRefresh}
        isRefreshing={isPending}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  historyItem: {
    borderBottomWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
  },
  clearText: {
    fontSize: 14,
    color: "#3b82f6",
  },
  emptyText: {
    padding: 12,
    textAlign: "center",
    color: "#6b7280",
  },
});
