import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";

import { useCreateBookmarkList } from "@karakeep/shared-react/hooks/lists";

type ListType = "manual" | "smart";

const NewListPage = () => {
  const dismiss = () => {
    router.back();
  };
  const { toast } = useToast();
  const { colors } = useColorScheme();
  const [text, setText] = useState("");
  const [listType, setListType] = useState<ListType>("manual");
  const [query, setQuery] = useState("");

  const { mutate, isPending } = useCreateBookmarkList({
    onSuccess: () => {
      dismiss();
    },
    onError: (error) => {
      // Extract error message from the error object
      let errorMessage = "Something went wrong";
      if (error.data?.zodError) {
        errorMessage = Object.values(error.data.zodError.fieldErrors)
          .flat()
          .join("\n");
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        message: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = () => {
    // Validate smart list has a query
    if (listType === "smart" && !query.trim()) {
      toast({
        message: "Smart lists must have a search query",
        variant: "destructive",
      });
      return;
    }

    mutate({
      name: text,
      icon: "📁",
      type: listType,
      query: listType === "smart" ? query : undefined,
    });
  };

  return (
    <View style={styles.container}>
      {/* List Type Selector */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          List Type
        </Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Button
              variant={listType === "manual" ? "primary" : "secondary"}
              onPress={() => setListType("manual")}
            >
              <Text>Manual</Text>
            </Button>
          </View>
          <View style={styles.flex1}>
            <Button
              variant={listType === "smart" ? "primary" : "secondary"}
              onPress={() => setListType("smart")}
            >
              <Text>Smart</Text>
            </Button>
          </View>
        </View>
      </View>

      {/* List Name */}
      <View style={styles.nameRow}>
        <Text style={styles.icon}>📁</Text>
        <Input
          style={styles.flex1}
          inputStyle={{ backgroundColor: colors.card }}
          onChangeText={setText}
          placeholder="List Name"
          autoFocus
          autoCapitalize={"none"}
        />
      </View>

      {/* Smart List Query Input */}
      {listType === "smart" && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Search Query
          </Text>
          <Input
            inputStyle={{ backgroundColor: colors.card }}
            onChangeText={setQuery}
            value={query}
            placeholder="e.g., #important OR list:work"
            autoCapitalize={"none"}
          />
          <Text style={[styles.italic, { color: colors.mutedForeground }]}>
            Smart lists automatically show bookmarks matching your search query
          </Text>
        </View>
      )}

      <Button disabled={isPending} onPress={onSubmit}>
        <Text>Save</Text>
      </Button>
    </View>
  );
};

export default NewListPage;

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingHorizontal: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  icon: {
    flexShrink: 1,
    padding: 8,
  },
  italic: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
