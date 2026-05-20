import { StyleProp, View, ViewStyle } from "react-native";
import { Image, ImageContentFit } from "expo-image";
import { useAssetUrl } from "@/lib/hooks";

export default function BookmarkAssetImage({
  assetId,
  style,
  contentFit = "cover",
}: {
  assetId: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
}) {
  const assetSource = useAssetUrl(assetId);

  return (
    <View style={style}>
      <Image
        source={assetSource}
        style={{ width: "100%", height: "100%" }}
        contentFit={contentFit}
      />
    </View>
  );
}
