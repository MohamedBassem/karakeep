import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Divider } from "@/components/ui/Divider";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { Check } from "lucide-react-native";

export default function BookmarkDefaultViewSettings() {
  const router = useRouter();
  const { toast } = useToast();
  const { colors } = useColorScheme();
  const { settings, setSettings } = useAppSettings();

  const handleUpdate = async (
    mode: "reader" | "browser" | "externalBrowser",
  ) => {
    try {
      await setSettings({
        ...settings,
        defaultBookmarkView: mode,
      });
      toast({
        message: "Default Bookmark View updated!",
        showProgress: false,
      });
      router.back();
    } catch {
      toast({
        message: "Something went wrong",
        variant: "destructive",
        showProgress: false,
      });
    }
  };

  const options = (["reader", "browser", "externalBrowser"] as const)
    .map((mode) => {
      const currentMode = settings.defaultBookmarkView;
      const isChecked = currentMode === mode;
      return [
        <Pressable
          onPress={() => handleUpdate(mode)}
          style={styles.row}
          key={mode}
        >
          <Text style={styles.label} numberOfLines={1}>
            {
              {
                browser: "Browser",
                reader: "Reader",
                externalBrowser: "External Browser",
              }[mode]
            }
          </Text>
          {isChecked && <Check color="rgb(0, 122, 255)" />}
        </Pressable>,
        <Divider
          key={mode + "-divider"}
          orientation="horizontal"
          style={styles.divider}
        />,
      ];
    })
    .flat();
  options.pop();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {options}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    marginRight: 8,
    flex: 1,
  },
  divider: {
    marginVertical: 12,
    height: 2,
    width: "100%",
  },
  scrollContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
