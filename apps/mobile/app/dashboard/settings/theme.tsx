import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Divider } from "@/components/ui/Divider";
import { Text } from "@/components/ui/Text";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { Check } from "lucide-react-native";

export default function ThemePage() {
  const { settings, setSettings } = useAppSettings();
  const { colors } = useColorScheme();

  const options = (["light", "dark", "system"] as const)
    .map((theme) => {
      const isChecked = settings.theme === theme;
      return [
        <Pressable
          onPress={() => setSettings({ ...settings, theme })}
          style={styles.row}
          key={theme}
        >
          <Text style={styles.label} numberOfLines={1}>
            {
              { light: "Light Mode", dark: "Dark Mode", system: "System" }[
                theme
              ]
            }
          </Text>
          {isChecked && <Check color="rgb(0, 122, 255)" />}
        </Pressable>,
        <Divider
          key={theme + "-divider"}
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
