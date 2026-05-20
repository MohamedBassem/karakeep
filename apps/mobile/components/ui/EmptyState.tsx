import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { withOpacity } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  const { colors } = useColorScheme();

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: withOpacity(colors.primary, 0.1) },
        ]}
      >
        <Icon size={36} color={colors.primary} />
      </View>
      <Text variant="title3" style={styles.title}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    marginBottom: 16,
    height: 80,
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  title: {
    textAlign: "center",
    width: "100%",
  },
  subtitle: {
    textAlign: "center",
    width: "100%",
    marginTop: 4,
  },
});
