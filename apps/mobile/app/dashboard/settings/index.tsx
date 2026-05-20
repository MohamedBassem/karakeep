import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { useHeaderHeight } from "@react-navigation/elements";
import { UserProfileHeader } from "@/components/settings/UserProfileHeader";
import {
  GroupedButtonRow,
  GroupedSection,
  RowSeparator,
  SettingRow,
} from "@/components/ui/GroupedList";
import { Text } from "@/components/ui/Text";
import { useServerVersion } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@karakeep/shared-react/trpc";

const THEME_LABELS = { light: "Light", dark: "Dark", system: "System" };
const VIEW_LABELS = {
  reader: "Reader",
  browser: "Browser",
  externalBrowser: "External Browser",
};

export default function Settings() {
  const { logout } = useSession();
  const headerHeight = useHeaderHeight();
  const { colors } = useColorScheme();
  const {
    settings,
    setSettings,
    isLoading: isSettingsLoading,
  } = useAppSettings();
  const api = useTRPC();

  const [imageQuality, setImageQuality] = useState<number | null>(null);

  useEffect(() => {
    setImageQuality(settings.imageQuality * 100);
  }, [settings.imageQuality]);

  const { data, error } = useQuery(api.users.whoami.queryOptions());
  const {
    data: serverVersion,
    isLoading: isServerVersionLoading,
    error: serverVersionError,
  } = useServerVersion();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");

  const { mutate: deleteAccount, isPending: isDeleting } = useMutation(
    api.users.deleteAccount.mutationOptions({
      onSuccess: () => {
        setShowPasswordModal(false);
        setPassword("");
        Alert.alert(
          "Account Deleted",
          "Your account has been successfully deleted.",
          [{ text: "OK", onPress: logout }],
        );
      },
      onError: (e) => {
        if (e.data?.code === "UNAUTHORIZED") {
          Alert.alert("Error", "Invalid password. Please try again.");
        } else {
          Alert.alert("Error", "Failed to delete account. Please try again.");
        }
      },
    }),
  );

  const isLocalUser = data?.localUser ?? false;

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? All your bookmarks, lists, tags, highlights, and other data will be permanently deleted. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (isLocalUser) {
              setShowPasswordModal(true);
            } else {
              deleteAccount({});
            }
          },
        },
      ],
    );
  };

  if (error?.data?.code === "UNAUTHORIZED") {
    logout();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: 40 + headerHeight },
      ]}
    >
      <UserProfileHeader
        image={data?.image}
        name={data?.name}
        email={data?.email}
      />

      <GroupedSection header="Appearance">
        <SettingRow
          label="Theme"
          value={THEME_LABELS[settings.theme]}
          href="/dashboard/settings/theme"
        />
        <RowSeparator />
        <SettingRow
          label="Default Bookmark View"
          value={VIEW_LABELS[settings.defaultBookmarkView]}
          loading={isSettingsLoading}
          href="/dashboard/settings/bookmark-default-view"
        />
      </GroupedSection>

      <GroupedSection header="Reading">
        <SettingRow
          label="Reader Text Settings"
          href="/dashboard/settings/reader-settings"
        />
        <RowSeparator />
        <SettingRow
          label="Show notes in bookmark card"
          trailing={
            <Switch
              value={settings.showNotes}
              onValueChange={(value) =>
                setSettings({ ...settings, showNotes: value })
              }
            />
          }
        />
        <RowSeparator />
        <SettingRow
          label="Toolbar Buttons"
          href="/dashboard/settings/toolbar-settings"
        />
        <RowSeparator />
        <SettingRow
          label="Keep screen on while reading"
          trailing={
            <Switch
              disabled={isSettingsLoading}
              value={settings.keepScreenOnWhileReading}
              onValueChange={(value) => {
                if (isSettingsLoading) return;
                setSettings({ ...settings, keepScreenOnWhileReading: value });
              }}
            />
          }
        />
      </GroupedSection>

      <GroupedSection header="Media">
        <View style={styles.mediaInner}>
          <View style={styles.mediaTopRow}>
            <Text>Upload Image Quality</Text>
            <Text>{Math.round(imageQuality ?? 0)}%</Text>
          </View>
          {imageQuality === null ? (
            <ActivityIndicator size="small" />
          ) : (
            <Slider
              style={styles.slider}
              onSlidingComplete={(value) =>
                setSettings({
                  ...settings,
                  imageQuality: Math.round(value) / 100,
                })
              }
              onValueChange={(value) => setImageQuality(value)}
              value={imageQuality}
              minimumValue={0}
              maximumValue={100}
            />
          )}
        </View>
      </GroupedSection>

      <GroupedSection header="Account">
        <GroupedButtonRow
          label="Log Out"
          tone="destructive"
          align="left"
          onPress={logout}
        />
        <RowSeparator />
        <GroupedButtonRow
          label="Delete Account"
          tone="destructive"
          align="left"
          onPress={handleDeleteAccount}
          loading={isDeleting}
        />
      </GroupedSection>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPassword("");
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setShowPasswordModal(false);
            setPassword("");
          }}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
          >
            <Text style={styles.modalTitle}>Enter Password</Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.mutedForeground }]}
            >
              Please enter your password to confirm account deletion.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.input,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                },
              ]}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
              >
                <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalDeleteButton,
                  { backgroundColor: colors.destructive },
                ]}
                onPress={() => deleteAccount({ password })}
                disabled={isDeleting || !password}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={[
                      styles.modalDeleteText,
                      { color: colors.destructiveForeground },
                    ]}
                  >
                    Delete
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <GroupedSection header="About">
        <SettingRow
          label="Server"
          value={isSettingsLoading ? "Loading..." : settings.address}
        />
        <RowSeparator />
        <SettingRow
          label="App Version"
          value={Constants.expoConfig?.version ?? "unknown"}
        />
        <RowSeparator />
        <SettingRow
          label="Server Version"
          value={
            isServerVersionLoading
              ? "Loading..."
              : serverVersionError
                ? "unavailable"
                : (serverVersion ?? "unknown")
          }
        />
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },
  mediaInner: {
    flexDirection: "column",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mediaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slider: {
    height: 40,
    width: "100%",
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    marginHorizontal: 32,
    width: "100%",
    maxWidth: 384,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    marginBottom: 16,
    fontSize: 14,
  },
  modalInput: {
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalDeleteButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalDeleteText: {
    fontWeight: "500",
  },
});
