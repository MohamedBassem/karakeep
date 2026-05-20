import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BookmarkSearchResults from "@/components/search/BookmarkSearchResults";
import { useBookmarkSearchState } from "@/lib/useBookmarkSearchState";
import { useColorScheme } from "@/lib/useColorScheme";
import { SearchInput } from "@/components/ui/SearchInput";
import { XIcon } from "lucide-react-native";

interface InlineSearchProps {
  onClose: () => void;
  rightElement?: React.ReactNode;
}

export default function InlineSearch({
  onClose,
  rightElement,
}: InlineSearchProps) {
  const [search, setSearch] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const state = useBookmarkSearchState(search);
  const { colors } = useColorScheme();

  const handleSearchSubmit = () => {
    state.commitTerm(search);
    inputRef.current?.blur();
  };

  const handleSelectHistory = (term: string) => {
    setSearch(term);
    state.commitTerm(term);
    inputRef.current?.blur();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchWrap}>
          <SearchInput
            ref={inputRef}
            placeholder="Search bookmarks..."
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              setIsInputFocused(false);
              state.commitTerm(search);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
          />
        </View>
        {rightElement}
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <XIcon size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <BookmarkSearchResults
        rawSearch={search}
        isInputFocused={isInputFocused}
        state={state}
        onSelectHistory={handleSelectHistory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchWrap: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});
