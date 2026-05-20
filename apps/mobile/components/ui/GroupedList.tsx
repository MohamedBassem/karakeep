import { Pressable, StyleSheet, View } from "react-native";
import ChevronRight from "@/components/ui/ChevronRight";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { withOpacity } from "@/components/ui/Text";

/**
 * iOS-style grouped table section with an optional uppercase header label
 * and a rounded card container for its children.
 */
function GroupedSection({
  children,
  header,
}: {
  children: React.ReactNode;
  header?: string;
}) {
  const { colors } = useColorScheme();
  return (
    <View style={{ gap: 6 }}>
      {header && (
        <Text variant="footnote" color="tertiary" style={styles.header}>
          {header}
        </Text>
      )}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

/**
 * Hairline separator indented from the left, used between rows
 * within a GroupedSection.
 */
function RowSeparator() {
  const { colors } = useColorScheme();
  return (
    <View
      style={{
        marginLeft: 16,
        height: StyleSheet.hairlineWidth,
        backgroundColor: withOpacity(colors.border, 0.3),
      }}
    />
  );
}

/**
 * A pressable row with a label and a trailing chevron,
 * used for drill-down navigation within a GroupedSection.
 */
function NavigationRow({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <ChevronRight size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    textTransform: "uppercase",
  },
  section: {
    overflow: "hidden",
    borderRadius: 12,
    borderCurve: "continuous",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export { GroupedSection, NavigationRow, RowSeparator };
