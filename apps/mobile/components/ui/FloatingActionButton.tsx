import { Platform, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useToast } from "@/components/ui/Toast";
import useAppSettings from "@/lib/settings";
import { useUploadAsset } from "@/lib/upload";
import { MenuView } from "@react-native-menu/menu";
import { Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FloatingActionButton() {
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { uploadAsset } = useUploadAsset(settings, {
    onError: (e) => {
      toast({ message: e, variant: "destructive" });
    },
  });

  const openNewBookmarkModal = () => {
    router.push("/dashboard/bookmarks/new");
  };

  return (
    <View
      style={{
        position: "absolute",
        right: 16,
        bottom: Math.max(insets.bottom, 16) + 16,
      }}
    >
      <MenuView
        onPressAction={async ({ nativeEvent }) => {
          Haptics.selectionAsync();
          if (nativeEvent.event === "new") {
            openNewBookmarkModal();
          } else if (nativeEvent.event === "library") {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: settings.imageQuality,
              allowsMultipleSelection: false,
            });
            if (!result.canceled) {
              uploadAsset({
                type: result.assets[0].mimeType ?? "",
                name: result.assets[0].fileName ?? "",
                uri: result.assets[0].uri,
              });
            }
          }
        }}
        actions={[
          {
            id: "new",
            title: "New Bookmark",
            image: Platform.select({
              ios: "note.text",
            }),
          },
          {
            id: "library",
            title: "Photo Library",
            image: Platform.select({
              ios: "photo",
            }),
          },
        ]}
        shouldOpenOnLongPress={false}
      >
        <View
          className="h-14 w-14 items-center justify-center rounded-full bg-primary"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Plus color="white" size={28} onPress={() => Haptics.selectionAsync()} />
        </View>
      </MenuView>
    </View>
  );
}
