import * as React from "react";
import {
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import { useAssetUrl } from "@/lib/hooks";

interface AvatarProps {
  image?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
}

const AVATAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#e879f9",
];

function nameToColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isExternalUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function Avatar({
  image,
  name,
  size = 40,
  style,
  fallbackStyle,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const assetUrl = useAssetUrl(image ?? "");

  const imageUrl = React.useMemo(() => {
    if (!image) return null;
    return isExternalUrl(image) ? { uri: image } : assetUrl;
  }, [image]);

  React.useEffect(() => {
    setImageError(false);
  }, [image]);

  const initials = React.useMemo(() => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  }, [name]);

  const showFallback = !imageUrl || imageError;
  const avatarColor = nameToColor(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showFallback ? avatarColor : undefined,
        },
        style,
      ]}
    >
      {showFallback ? (
        <View
          style={[
            styles.fallback,
            { backgroundColor: avatarColor },
            fallbackStyle,
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: size * 0.4,
                lineHeight: size * 0.4,
              } as TextStyle,
            ]}
          >
            {initials}
          </Text>
        </View>
      ) : (
        <Image
          source={imageUrl}
          style={styles.image}
          contentFit="cover"
          onError={() => setImageError(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  fallback: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
