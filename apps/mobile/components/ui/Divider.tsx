import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { withOpacity } from "@/components/ui/Text";

function Divider({
  style,
  orientation,
  ...props
}: {
  color?: string;
  orientation: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
} & Omit<React.ComponentPropsWithoutRef<typeof View>, "style">) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const bg = isDarkColorScheme
    ? withOpacity(colors.border, 0.5)
    : "rgba(148, 163, 184, 0.2)"; // slate-400/20
  return (
    <View
      style={[
        { backgroundColor: bg },
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: { height: 2 },
  vertical: { width: 2 },
});

export { Divider };
