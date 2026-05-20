import type { StyleProp, View, ViewStyle } from "react-native";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";

function Skeleton({
  style,
  ...props
}: { style?: StyleProp<ViewStyle> } & Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  "style"
>) {
  const { colors } = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        { borderRadius: 6, backgroundColor: colors.muted, opacity: fadeAnim },
        style,
      ]}
      {...props}
    />
  );
}

export { Skeleton };
