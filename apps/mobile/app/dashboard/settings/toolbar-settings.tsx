import type { ToolbarActionId } from "@/lib/settings";
import { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { TOOLBAR_ACTION_REGISTRY } from "@/components/bookmarks/BottomActions";
import {
  GroupedButtonRow,
  GroupedSection,
  RowSeparator,
} from "@/components/ui/GroupedList";
import { Text, withOpacity } from "@/components/ui/Text";
import useAppSettings, {
  DEFAULT_OVERFLOW_ACTIONS,
  DEFAULT_TOOLBAR_ACTIONS,
} from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { GripVertical, Minus, Plus } from "lucide-react-native";

const MAX_VISIBLE = 6;

export default function ToolbarSettingsPage() {
  const { settings, setSettings } = useAppSettings();
  const { colors } = useColorScheme();

  const visible = settings.toolbarActions;
  const overflow = settings.overflowActions ?? [];

  const save = useCallback(
    (nextVisible: ToolbarActionId[], nextOverflow: ToolbarActionId[]) => {
      setSettings({
        ...settings,
        toolbarActions: nextVisible,
        overflowActions: nextOverflow,
      });
    },
    [settings, setSettings],
  );

  const demoteToOverflow = useCallback(
    (id: ToolbarActionId) => {
      save(
        visible.filter((a) => a !== id),
        [...overflow, id],
      );
    },
    [visible, overflow, save],
  );

  const promoteToVisible = useCallback(
    (id: ToolbarActionId) => {
      if (visible.length >= MAX_VISIBLE) return;
      save(
        [...visible, id],
        overflow.filter((a) => a !== id),
      );
    },
    [visible, overflow, save],
  );

  const resetToDefaults = () => {
    save([...DEFAULT_TOOLBAR_ACTIONS], [...DEFAULT_OVERFLOW_ACTIONS]);
  };

  const renderVisibleItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: {
      item: ToolbarActionId;
      drag: () => void;
      isActive: boolean;
    }) => {
      const meta = TOOLBAR_ACTION_REGISTRY[item];
      return (
        <ScaleDecorator>
          <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={drag}
            disabled={isActive}
            style={[styles.itemRow, { backgroundColor: colors.card }]}
          >
            <GripVertical size={18} color={colors.mutedForeground} />
            <meta.Icon size={20} color={colors.foreground} />
            <Text style={styles.flex1}>{meta.label}</Text>
            <Pressable
              onPress={() => demoteToOverflow(item)}
              style={styles.iconButton}
            >
              <Minus size={18} color={colors.mutedForeground} />
            </Pressable>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [demoteToOverflow, colors],
  );

  const renderOverflowItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: {
      item: ToolbarActionId;
      drag: () => void;
      isActive: boolean;
    }) => {
      const meta = TOOLBAR_ACTION_REGISTRY[item];
      const canPromote = visible.length < MAX_VISIBLE;
      return (
        <ScaleDecorator>
          <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={drag}
            disabled={isActive}
            style={[styles.itemRow, { backgroundColor: colors.card }]}
          >
            <GripVertical size={18} color={colors.mutedForeground} />
            <meta.Icon size={20} color={colors.mutedForeground} />
            <Text style={[styles.flex1, { color: colors.mutedForeground }]}>
              {meta.label}
            </Text>
            <Pressable
              onPress={() => promoteToVisible(item)}
              disabled={!canPromote}
              style={styles.iconButton}
            >
              <Plus
                size={18}
                color={
                  canPromote
                    ? colors.mutedForeground
                    : withOpacity(colors.mutedForeground, 0.3)
                }
              />
            </Pressable>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [visible.length, promoteToVisible, colors],
  );

  return (
    <ScrollView
      style={styles.fullWidth}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
    >
      <GroupedSection header={`Visible Actions (max ${MAX_VISIBLE})`}>
        {visible.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText} color="tertiary">
              No visible actions. Only the overflow menu will show.
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={visible}
            renderItem={renderVisibleItem}
            keyExtractor={(item) => item}
            onDragEnd={({ data }) => save(data, overflow)}
            scrollEnabled={false}
            ItemSeparatorComponent={RowSeparator}
          />
        )}
      </GroupedSection>

      <GroupedSection header="Overflow Actions">
        {overflow.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText} color="tertiary">
              No overflow actions. All actions are visible on the toolbar.
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={overflow}
            renderItem={renderOverflowItem}
            keyExtractor={(item) => item}
            onDragEnd={({ data }) => save(visible, data)}
            scrollEnabled={false}
            ItemSeparatorComponent={RowSeparator}
          />
        )}
      </GroupedSection>

      <GroupedSection>
        <GroupedButtonRow
          label="Reset to Defaults"
          tone="primary"
          onPress={resetToDefaults}
        />
      </GroupedSection>
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
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  flex1: {
    flex: 1,
  },
  iconButton: {
    padding: 6,
  },
});
