import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  GroupedSection,
  RowSeparator,
  SelectableRow,
} from "@/components/ui/GroupedList";
import { useToast } from "@/components/ui/Toast";
import useAppSettings from "@/lib/settings";

const MODES = ["reader", "browser", "externalBrowser"] as const;
const MODE_LABELS: Record<(typeof MODES)[number], string> = {
  reader: "Reader",
  browser: "Browser",
  externalBrowser: "External Browser",
};

export default function BookmarkDefaultViewSettings() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, setSettings } = useAppSettings();

  const handleUpdate = async (mode: (typeof MODES)[number]) => {
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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}
    >
      <GroupedSection>
        {MODES.map((mode, index) => (
          <React.Fragment key={mode}>
            {index > 0 && <RowSeparator />}
            <SelectableRow
              label={MODE_LABELS[mode]}
              selected={settings.defaultBookmarkView === mode}
              onPress={() => handleUpdate(mode)}
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
