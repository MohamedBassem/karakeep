import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";

export default function FullPageSpinner() {
  const { colors, isDarkColorScheme } = useColorScheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkColorScheme ? colors.background : "#f3f4f6" },
      ]}
    >
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
