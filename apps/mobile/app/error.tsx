import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";

export default function ErrorPage() {
  return (
    <View style={styles.container}>
      <Text variant="largeTitle">Error!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
});
