import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";
import {
  ReaderPreview,
  ReaderPreviewRef,
} from "@/components/reader/ReaderPreview";
import { Divider } from "@/components/ui/Divider";
import {
  GroupedButtonRow,
  GroupedSection,
  RowSeparator,
  SelectableRow,
} from "@/components/ui/GroupedList";
import { Text } from "@/components/ui/Text";
import { MOBILE_FONT_FAMILIES, useReaderSettings } from "@/lib/readerSettings";
import { useColorScheme } from "@/lib/useColorScheme";
import { RotateCcw } from "lucide-react-native";

import {
  formatFontFamily,
  formatFontSize,
  formatLineHeight,
  READER_SETTING_CONSTRAINTS,
} from "@karakeep/shared/types/readers";
import { ZReaderFontFamily } from "@karakeep/shared/types/users";

export default function ReaderSettingsPage() {
  const { colors } = useColorScheme();

  const {
    settings,
    localOverrides,
    hasLocalOverrides,
    hasServerDefaults,
    updateLocal,
    clearAllLocal,
    saveAsDefault,
    clearAllDefaults,
  } = useReaderSettings();

  const {
    fontSize: effectiveFontSize,
    lineHeight: effectiveLineHeight,
    fontFamily: effectiveFontFamily,
  } = settings;

  // Display values for showing rounded values while dragging
  const [displayFontSize, setDisplayFontSize] = useState(effectiveFontSize);
  const [displayLineHeight, setDisplayLineHeight] =
    useState(effectiveLineHeight);

  // Refs to track latest display values (avoids stale closures in callbacks)
  const displayFontSizeRef = useRef(displayFontSize);
  displayFontSizeRef.current = displayFontSize;
  const displayLineHeightRef = useRef(displayLineHeight);
  displayLineHeightRef.current = displayLineHeight;

  // Ref for the WebView preview component
  const previewRef = useRef<ReaderPreviewRef>(null);

  // Functions to update preview styles
  const updatePreviewFontSize = useCallback(
    (fontSize: number) => {
      setDisplayFontSize(fontSize);
      previewRef.current?.updateStyles(
        effectiveFontFamily,
        fontSize,
        displayLineHeightRef.current,
      );
    },
    [effectiveFontFamily],
  );

  const updatePreviewLineHeight = useCallback(
    (lineHeight: number) => {
      setDisplayLineHeight(lineHeight);
      previewRef.current?.updateStyles(
        effectiveFontFamily,
        displayFontSizeRef.current,
        lineHeight,
      );
    },
    [effectiveFontFamily],
  );

  // Sync display values with effective settings
  useEffect(() => {
    setDisplayFontSize(effectiveFontSize);
  }, [effectiveFontSize]);

  useEffect(() => {
    setDisplayLineHeight(effectiveLineHeight);
  }, [effectiveLineHeight]);

  const handleFontFamilyChange = (fontFamily: ZReaderFontFamily) => {
    updateLocal({ fontFamily });
    // Update preview immediately with new font family
    previewRef.current?.updateStyles(
      fontFamily,
      displayFontSize,
      displayLineHeight,
    );
  };

  const handleFontSizeChange = (value: number) => {
    updateLocal({ fontSize: Math.round(value) });
  };

  const handleLineHeightChange = (value: number) => {
    updateLocal({ lineHeight: Math.round(value * 10) / 10 });
  };

  const handleSaveAsDefault = () => {
    saveAsDefault();
    // Note: clearAllLocal is called automatically in the shared hook's onSuccess
  };

  const fontFamilyOptions: ZReaderFontFamily[] = ["serif", "sans", "mono"];

  const localBadge = <Text style={{ color: colors.primary }}> (local)</Text>;

  return (
    <ScrollView
      style={styles.fullWidth}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Font Family Selection */}
      <GroupedSection
        header={
          <>
            Font Family
            {localOverrides.fontFamily !== undefined && localBadge}
          </>
        }
      >
        {fontFamilyOptions.map((fontFamily, index) => (
          <React.Fragment key={fontFamily}>
            {index > 0 && <RowSeparator />}
            <SelectableRow
              label={formatFontFamily(fontFamily)}
              labelStyle={{ fontFamily: MOBILE_FONT_FAMILIES[fontFamily] }}
              selected={effectiveFontFamily === fontFamily}
              onPress={() => handleFontFamilyChange(fontFamily)}
            />
          </React.Fragment>
        ))}
      </GroupedSection>

      {/* Font Size */}
      <GroupedSection
        header={
          <>
            {`Font Size (${formatFontSize(displayFontSize)})`}
            {localOverrides.fontSize !== undefined && localBadge}
          </>
        }
      >
        <View style={styles.sliderRow}>
          <Text style={{ color: colors.mutedForeground }}>
            {READER_SETTING_CONSTRAINTS.fontSize.min}
          </Text>
          <Slider
            style={styles.slider}
            value={displayFontSize}
            minimumValue={READER_SETTING_CONSTRAINTS.fontSize.min}
            maximumValue={READER_SETTING_CONSTRAINTS.fontSize.max}
            onValueChange={(value) => updatePreviewFontSize(Math.round(value))}
            onSlidingComplete={(value) =>
              handleFontSizeChange(Math.round(value))
            }
          />
          <Text style={{ color: colors.mutedForeground }}>
            {READER_SETTING_CONSTRAINTS.fontSize.max}
          </Text>
        </View>
      </GroupedSection>

      {/* Line Height */}
      <GroupedSection
        header={
          <>
            {`Line Height (${formatLineHeight(displayLineHeight)})`}
            {localOverrides.lineHeight !== undefined && localBadge}
          </>
        }
      >
        <View style={styles.sliderRow}>
          <Text style={{ color: colors.mutedForeground }}>
            {READER_SETTING_CONSTRAINTS.lineHeight.min}
          </Text>
          <Slider
            style={styles.slider}
            value={displayLineHeight}
            minimumValue={READER_SETTING_CONSTRAINTS.lineHeight.min}
            maximumValue={READER_SETTING_CONSTRAINTS.lineHeight.max}
            onValueChange={(value) =>
              updatePreviewLineHeight(Math.round(value * 10) / 10)
            }
            onSlidingComplete={handleLineHeightChange}
          />
          <Text style={{ color: colors.mutedForeground }}>
            {READER_SETTING_CONSTRAINTS.lineHeight.max}
          </Text>
        </View>
      </GroupedSection>

      {/* Preview */}
      <GroupedSection header="Preview">
        <ReaderPreview
          ref={previewRef}
          initialFontFamily={effectiveFontFamily}
          initialFontSize={effectiveFontSize}
          initialLineHeight={effectiveLineHeight}
        />
      </GroupedSection>

      <Divider orientation="horizontal" style={styles.bigDivider} />

      {/* Save as Default */}
      <GroupedSection>
        <GroupedButtonRow
          label="Save as Default (All Devices)"
          tone="primary"
          onPress={handleSaveAsDefault}
          disabled={!hasLocalOverrides}
        />
      </GroupedSection>

      {/* Clear Local */}
      {hasLocalOverrides && (
        <GroupedSection>
          <GroupedButtonRow
            label="Clear Local Overrides"
            icon={RotateCcw}
            tone="muted"
            onPress={clearAllLocal}
          />
        </GroupedSection>
      )}

      {/* Clear Server */}
      {hasServerDefaults && (
        <GroupedSection>
          <GroupedButtonRow
            label="Clear Server Defaults"
            icon={RotateCcw}
            tone="muted"
            onPress={clearAllDefaults}
          />
        </GroupedSection>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  slider: {
    height: 40,
    flex: 1,
  },
  bigDivider: {
    marginVertical: 8,
    width: "100%",
  },
});
