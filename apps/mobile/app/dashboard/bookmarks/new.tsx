import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";

import { useCreateBookmark } from "@karakeep/shared-react/hooks/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

const NoteEditorPage = () => {
  const dismiss = () => {
    router.back();
  };

  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { toast } = useToast();
  const { colors } = useColorScheme();

  const { mutate: createBookmark, isPending } = useCreateBookmark({
    onSuccess: (resp) => {
      if (resp.alreadyExists) {
        toast({
          message: "Bookmark already exists",
        });
      }
      setText("");
      dismiss();
    },
    onError: (e) => {
      let message;
      if (e.data?.zodError) {
        const zodError = e.data.zodError;
        message = JSON.stringify(zodError);
      } else {
        message = `Something went wrong: ${e.message}`;
      }
      setError(message);
    },
  });

  const onSubmit = () => {
    const data = text.trim();
    try {
      const url = new URL(data);
      if (url.protocol != "http:" && url.protocol != "https:") {
        throw new Error(`Unsupported URL protocol: ${url.protocol}`);
      }
      createBookmark({ type: BookmarkTypes.LINK, url: data, source: "mobile" });
    } catch {
      createBookmark({
        type: BookmarkTypes.TEXT,
        text: data,
        source: "mobile",
      });
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Input
        onChangeText={setText}
        inputStyle={{ backgroundColor: colors.card }}
        multiline
        placeholder="What's on your mind?"
        autoFocus
        autoCapitalize={"none"}
        textAlignVertical="top"
      />
      <Button onPress={onSubmit} disabled={isPending}>
        <Text>Save</Text>
      </Button>
    </View>
  );
};

export default NoteEditorPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorText: {
    width: "100%",
    textAlign: "center",
    color: "#ef4444",
  },
});
