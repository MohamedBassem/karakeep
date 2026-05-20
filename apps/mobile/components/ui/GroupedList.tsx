import type { Href } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import ChevronRight from "@/components/ui/ChevronRight";
import { Text, withOpacity } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { Check, Plus } from "lucide-react-native";

/**
 * iOS-style grouped table section with an optional uppercase header label
 * and a rounded card container for its children.
 */
function GroupedSection({
  children,
  header,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
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
 * A row with a label, an optional trailing value, and a trailing slot.
 * When `onPress` or `href` is set the row is pressable and shows a chevron
 * (unless a custom `trailing` node is provided).
 */
function SettingRow({
  label,
  value,
  loading,
  destructive,
  trailing,
  onPress,
  href,
  disabled,
}: {
  label: string;
  value?: string;
  loading?: boolean;
  destructive?: boolean;
  trailing?: React.ReactNode;
  onPress?: () => void;
  href?: Href;
  disabled?: boolean;
}) {
  const { colors } = useColorScheme();
  const router = useRouter();
  const handlePress = onPress ?? (href ? () => router.push(href) : undefined);
  const interactive = !!handlePress;

  const content = (
    <>
      <Text
        style={[styles.rowLabel, destructive && { color: colors.destructive }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        value !== undefined && (
          <Text style={styles.rowValue} color="tertiary" numberOfLines={1}>
            {value}
          </Text>
        )
      )}
      {trailing}
      {interactive && !trailing && <ChevronRight size={16} />}
    </>
  );

  if (handlePress) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
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
  return <SettingRow label={label} onPress={onPress} />;
}

/**
 * A pressable row showing a label with a trailing selection indicator —
 * a check when `selected`, a spinner when `loading`. With `accent` the row
 * reads as an additive action (primary label + plus icon).
 */
function SelectableRow({
  label,
  selected,
  loading,
  disabled,
  accent,
  labelStyle,
  onPress,
}: {
  label: string;
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  accent?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  onPress: () => void;
}) {
  const { colors } = useColorScheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text
        style={[
          styles.rowLabel,
          accent && { color: colors.primary },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" />
      ) : accent ? (
        <Plus size={20} color={colors.primary} strokeWidth={2} />
      ) : (
        selected && <Check size={20} color={colors.primary} strokeWidth={2.5} />
      )}
    </Pressable>
  );
}

type ButtonTone = "default" | "primary" | "destructive" | "muted";

/**
 * A full-width pressable button row meant to live inside a GroupedSection.
 * Renders an optional leading icon and a centered (or left-aligned) label.
 */
function GroupedButtonRow({
  label,
  onPress,
  icon: Icon,
  tone = "default",
  align = "center",
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  tone?: ButtonTone;
  align?: "center" | "left";
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useColorScheme();
  const toneColor =
    tone === "primary"
      ? colors.primary
      : tone === "destructive"
        ? colors.destructive
        : tone === "muted"
          ? colors.mutedForeground
          : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonRow,
        align === "left" && styles.buttonRowLeft,
        (disabled || loading) && { opacity: 0.5 },
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={toneColor} />
      ) : (
        Icon && <Icon size={16} color={toneColor} />
      )}
      <Text style={{ color: toneColor }} numberOfLines={1}>
        {label}
      </Text>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  pressed: {
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonRowLeft: {
    justifyContent: "flex-start",
  },
});

export {
  GroupedButtonRow,
  GroupedSection,
  NavigationRow,
  RowSeparator,
  SelectableRow,
  SettingRow,
};
