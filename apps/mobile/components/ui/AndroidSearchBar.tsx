import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useIsFocused } from "@react-navigation/core";
import { Search } from "lucide-react-native";

export default function AndroidSearchBar({
  label,
  onPress,
  rightElement,
}: {
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { colors } = useColorScheme();

  return (
    <View
      style={[
        styles.outer,
        {
          paddingTop: insets.top + 8,
          opacity: isFocused ? 1 : 0,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        style={[styles.pressable, { backgroundColor: colors.card }]}
        onPress={onPress}
      >
        <Search size={24} color={colors.muted} />
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
        {rightElement}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 15,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
  },
  label: {
    flex: 1,
    fontSize: 17,
  },
});
