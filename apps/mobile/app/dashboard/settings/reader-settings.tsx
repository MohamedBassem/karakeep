import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";
import {
  ReaderPreview,
  ReaderPreviewRef,
} from "@/components/reader/ReaderPreview";
import { Divider } from "@/components/ui/Divider";
import { Text } from "@/components/ui/Text";
import { MOBILE_FONT_FAMILIES, useReaderSettings } from "@/lib/readerSettings";
import { useColorScheme } from "@/lib/useColorScheme";
import { Check, RotateCcw } from "lucide-react-native";

import {
  formatFontFamily,
  formatFontSize,
  formatLineHeight,
  READER_SETTING_CONSTRAINTS,
} from "@karakeep/shared/types/readers";
import { ZReaderFontFamily } from "@karakeep/shared/types/users";

export default function ReaderSettingsPage() {
  const { isDarkColorScheme: isDark, colors } = useColorScheme();

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

  const handleClearLocalOverrides = () => {
    clearAllLocal();
  };

  const handleClearServerDefaults = () => {
    clearAllDefaults();
  };

  const fontFamilyOptions: ZReaderFontFamily[] = ["serif", "sans", "mono"];

  return (
    <ScrollView
      style={styles.fullWidth}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Font Family Selection */}
      <View style={styles.fullWidth}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Font Family
          {localOverrides.fontFamily !== undefined && (
            <Text style={styles.localBadge}> (local)</Text>
          )}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {fontFamilyOptions.map((fontFamily, index) => {
            const isChecked = effectiveFontFamily === fontFamily;
            return (
              <View key={fontFamily}>
                <Pressable
                  onPress={() => handleFontFamilyChange(fontFamily)}
                  style={styles.optionRow}
                >
                  <Text
                    style={{
                      fontFamily: MOBILE_FONT_FAMILIES[fontFamily],
                    }}
                  >
                    {formatFontFamily(fontFamily)}
                  </Text>
                  {isChecked && <Check color="rgb(0, 122, 255)" />}
                </Pressable>
                {index < fontFamilyOptions.length - 1 && (
                  <Divider orientation="horizontal" style={{ height: 2 }} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Font Size */}
      <View style={styles.fullWidth}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Font Size ({formatFontSize(displayFontSize)})
          {localOverrides.fontSize !== undefined && (
            <Text style={styles.localBadge}> (local)</Text>
          )}
        </Text>
        <View style={[styles.sliderCard, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.mutedForeground }}>
            {READER_SETTING_CONSTRAINTS.fontSize.min}
          </Text>
          <Slider
            style={{ height: 40, flex: 1 }}
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
      </View>

      {/* Line Height */}
      <View style={styles.fullWidth}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Line Height ({formatLineHeight(displayLineHeight)})
          {localOverrides.lineHeight !== undefined && (
            <Text style={styles.localBadge}> (local)</Text>
          )}
        </Text>
        <View style={[styles.sliderCard, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.mutedForeground }}>
            {READER_SETTING_CONSTRAINTS.lineHeight.min}
          </Text>
          <Slider
            style={{ height: 40, flex: 1 }}
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
      </View>

      {/* Preview */}
      <View style={styles.fullWidth}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Preview
        </Text>
        <ReaderPreview
          ref={previewRef}
          initialFontFamily={effectiveFontFamily}
          initialFontSize={effectiveFontSize}
          initialLineHeight={effectiveLineHeight}
        />
      </View>

      <Divider orientation="horizontal" style={styles.bigDivider} />

      {/* Save as Default */}
      <Pressable
        onPress={handleSaveAsDefault}
        disabled={!hasLocalOverrides}
        style={[styles.actionCard, { backgroundColor: colors.card }]}
      >
        <Text
          style={[
            styles.actionText,
            {
              color: hasLocalOverrides ? "#3b82f6" : colors.mutedForeground,
            },
          ]}
        >
          Save as Default (All Devices)
        </Text>
      </Pressable>

      {/* Clear Local */}
      {hasLocalOverrides && (
        <Pressable
          onPress={handleClearLocalOverrides}
          style={[styles.clearCard, { backgroundColor: colors.card }]}
        >
          <RotateCcw size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
          <Text style={{ color: colors.mutedForeground }}>
            Clear Local Overrides
          </Text>
        </Pressable>
      )}

      {/* Clear Server */}
      {hasServerDefaults && (
        <Pressable
          onPress={handleClearServerDefaults}
          style={[styles.clearCard, { backgroundColor: colors.card }]}
        >
          <RotateCcw size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
          <Text style={{ color: colors.mutedForeground }}>
            Clear Server Defaults
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  localBadge: {
    color: "#3b82f6",
  },
  card: {
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  sliderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  bigDivider: {
    marginVertical: 8,
    width: "100%",
  },
  actionCard: {
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: {
    textAlign: "center",
  },
  clearCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
