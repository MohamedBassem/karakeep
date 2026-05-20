import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useColorScheme } from "@/lib/useColorScheme";
import { useQuery } from "@tanstack/react-query";

import { useEditBookmarkList } from "@karakeep/shared-react/hooks/lists";
import { useTRPC } from "@karakeep/shared-react/trpc";

const EditListPage = () => {
  const { slug: listId } = useLocalSearchParams<{ slug?: string | string[] }>();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const { colors } = useColorScheme();
  const api = useTRPC();
  const { mutate, isPending: editIsPending } = useEditBookmarkList({
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

  if (typeof listId !== "string") {
    throw new Error("Unexpected param type");
  }

  const { data: list, isLoading: fetchIsPending } = useQuery(
    api.lists.get.queryOptions({
      listId,
    }),
  );

  const dismiss = () => {
    router.back();
  };

  useEffect(() => {
    if (!list) return;
    setText(list.name ?? "");
    setQuery(list.query ?? "");
  }, [list?.id, list?.query, list?.name]);

  const onSubmit = () => {
    if (!text.trim()) {
      toast({ message: "List name can't be empty", variant: "destructive" });
      return;
    }

    if (list?.type === "smart" && !query.trim()) {
      toast({
        message: "Smart lists must have a search query",
        variant: "destructive",
      });
      return;
    }

    mutate({
      listId,
      name: text.trim(),
      query: list?.type === "smart" ? query.trim() : undefined,
    });
  };

  const isPending = fetchIsPending || editIsPending;

  return (
    <>
      {isPending ? (
        <FullPageSpinner />
      ) : (
        <View style={styles.container}>
          {/* List Type Info - not editable */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              List Type
            </Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Button
                  variant={list?.type === "manual" ? "primary" : "secondary"}
                  disabled
                >
                  <Text>Manual</Text>
                </Button>
              </View>
              <View style={styles.flex1}>
                <Button
                  variant={list?.type === "smart" ? "primary" : "secondary"}
                  disabled
                >
                  <Text>Smart</Text>
                </Button>
              </View>
            </View>
          </View>

          {/* List Name */}
          <View style={styles.nameRow}>
            <Text style={styles.icon}>{list?.icon || "🚀"}</Text>
            <Input
              style={styles.flex1}
              inputStyle={{ backgroundColor: colors.card }}
              onChangeText={setText}
              value={text}
              placeholder="List Name"
              autoFocus
              autoCapitalize={"none"}
            />
          </View>

          {/* Smart List Query Input */}
          {list?.type === "smart" && (
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
                Smart lists automatically show bookmarks matching your search
                query
              </Text>
            </View>
          )}

          <Button disabled={isPending} onPress={onSubmit}>
            <Text>Save</Text>
          </Button>
        </View>
      )}
    </>
  );
};

export default EditListPage;

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
