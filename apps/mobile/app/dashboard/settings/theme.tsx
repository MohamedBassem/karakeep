import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
  GroupedSection,
  RowSeparator,
  SelectableRow,
} from "@/components/ui/GroupedList";
import useAppSettings from "@/lib/settings";

const THEMES = ["light", "dark", "system"] as const;
const THEME_LABELS: Record<(typeof THEMES)[number], string> = {
  light: "Light Mode",
  dark: "Dark Mode",
  system: "System",
};

export default function ThemePage() {
  const { settings, setSettings } = useAppSettings();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}
    >
      <GroupedSection>
        {THEMES.map((theme, index) => (
          <React.Fragment key={theme}>
            {index > 0 && <RowSeparator />}
            <SelectableRow
              label={THEME_LABELS[theme]}
              selected={settings.theme === theme}
              onPress={() => setSettings({ ...settings, theme })}
            />
          </React.Fragment>
        ))}
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
