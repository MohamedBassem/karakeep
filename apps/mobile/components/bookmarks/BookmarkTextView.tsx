import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import BookmarkTextMarkdown from "@/components/bookmarks/BookmarkTextMarkdown";
import { Button } from "@/components/ui/Button";
import { Text, withOpacity } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";

import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

interface BookmarkTextViewProps {
  bookmark: ZBookmark;
}

export default function BookmarkTextView({ bookmark }: BookmarkTextViewProps) {
  if (bookmark.content.type !== BookmarkTypes.TEXT) {
    throw new Error("Wrong content type rendered");
  }
  const { toast } = useToast();
  const { isDarkColorScheme, colors } = useColorScheme();

  const [isEditing, setIsEditing] = useState(false);
  const initialText = bookmark.content.text;
  const [content, setContent] = useState(initialText);

  const { mutate, isPending } = useUpdateBookmark({
    onError: () => {
      toast({
        message: "Something went wrong",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      toast({
        message: "Text updated successfully",
        showProgress: false,
      });
    },
  });

  const handleSave = () => {
    mutate({
      bookmarkId: bookmark.id,
      text: content,
    });
  };

  const handleDiscard = () => {
    setContent(initialText);
    setIsEditing(false);
    Keyboard.dismiss();
  };

  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <View style={styles.editToolbar}>
          <Button
            size="sm"
            onPress={handleDiscard}
            disabled={isPending}
            variant="plain"
          >
            <Text>Cancel</Text>
          </Button>
          <Button size="sm" onPress={handleSave} disabled={isPending}>
            <Text>{isPending ? "Saving..." : "Save"}</Text>
          </Button>
        </View>

        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          editable={!isPending}
          placeholder="Enter your text here..."
          placeholderTextColor={isDarkColorScheme ? "#666" : "#999"}
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 24,
            color: isDarkColorScheme ? "#fff" : "#000",
            textAlignVertical: "top",
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDarkColorScheme ? "#333" : "#ddd",
            backgroundColor: isDarkColorScheme ? "#111" : "#fff",
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.viewScroll,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Pressable onPress={() => setIsEditing(true)}>
        <View style={styles.viewBody}>
          <BookmarkTextMarkdown text={content} />
          {content.trim() === "" && (
            <Text
              style={{
                fontStyle: "italic",
                color: withOpacity(colors.mutedForeground, 0.9),
              }}
            >
              Tap to add text...
            </Text>
          )}
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  editContainer: {
    flex: 1,
    padding: 16,
  },
  editToolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewScroll: {
    margin: 16,
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  viewBody: {
    minHeight: 200,
    borderRadius: 12,
    padding: 16,
  },
});
