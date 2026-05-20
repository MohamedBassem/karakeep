import { StyleSheet, View } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { Text } from "@/components/ui/Text";

import { Button } from "./ui/Button";

export default function FullPageError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const { colors } = useColorScheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: "transparent" },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Something Went Wrong
        </Text>
        <Text style={{ color: colors.foreground }}> {error}</Text>
        <Button onPress={onRetry}>
          <Text>Retry</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    height: "25%",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  title: {
    fontSize: 30,
  },
});
