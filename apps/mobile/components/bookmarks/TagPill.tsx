import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useColorScheme } from "@/lib/useColorScheme";

import { ZBookmarkTags } from "@karakeep/shared/types/tags";

export default function TagPill({
  tag,
  clickable = true,
}: {
  tag: ZBookmarkTags;
  clickable?: boolean;
}) {
  const { colors } = useColorScheme();
  return (
    <View key={tag.id} style={[styles.pill, { borderColor: colors.input }]}>
      {clickable ? (
        <Link
          style={{ color: colors.foreground }}
          numberOfLines={1}
          href={`dashboard/tags/${tag.id}`}
        >
          {tag.name}
        </Link>
      ) : (
        <Text style={{ color: colors.foreground }} numberOfLines={1}>
          {tag.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
});
