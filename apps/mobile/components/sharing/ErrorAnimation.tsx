import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColorScheme } from "@/lib/useColorScheme";
import * as Haptics from "expo-haptics";
import { AlertCircle } from "lucide-react-native";

export default function ErrorAnimation() {
  const { colors } = useColorScheme();
  const scale = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 100 }),
      withTiming(-10, { duration: 100 }),
      withTiming(10, { duration: 100 }),
      withTiming(0, { duration: 50 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  return (
    <Animated.View style={[style, styles.container]}>
      <Animated.View
        style={[styles.icon, { backgroundColor: colors.destructive }]}
      >
        <AlertCircle size={48} color="white" strokeWidth={2} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
  },
  icon: {
    height: 96,
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
});
