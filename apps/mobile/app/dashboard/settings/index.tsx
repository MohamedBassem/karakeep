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
import { Link } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { UserProfileHeader } from "@/components/settings/UserProfileHeader";
import ChevronRight from "@/components/ui/ChevronRight";
import { Divider } from "@/components/ui/Divider";
import { Text } from "@/components/ui/Text";
import { useServerVersion } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@karakeep/shared-react/trpc";

function SectionHeader({ title }: { title: string }) {
  const { colors } = useColorScheme();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

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
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 40 + headerHeight,
      }}
    >
      <UserProfileHeader
        image={data?.image}
        name={data?.name}
        email={data?.email}
      />

      <SectionHeader title="Appearance" />
      <View
        style={[
          styles.cardGroup,
          { backgroundColor: colors.card, borderCurve: "continuous" },
        ]}
      >
        <View style={styles.rowOuter}>
          <Link asChild href="/dashboard/settings/theme" style={styles.flex1}>
            <Pressable style={styles.pressableRow}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                Theme
              </Text>
              <Text
                style={[styles.rowValue, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {
                  { light: "Light", dark: "Dark", system: "System" }[
                    settings.theme
                  ]
                }
              </Text>
              <ChevronRight />
            </Pressable>
          </Link>
        </View>
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.rowOuter}>
          <Link
            asChild
            href="/dashboard/settings/bookmark-default-view"
            style={styles.flex1}
          >
            <Pressable style={styles.pressableRow}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                Default Bookmark View
              </Text>
              {isSettingsLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  style={[styles.rowValue, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {
                    {
                      reader: "Reader",
                      browser: "Browser",
                      externalBrowser: "External Browser",
                    }[settings.defaultBookmarkView]
                  }
                </Text>
              )}
              <ChevronRight />
            </Pressable>
          </Link>
        </View>
      </View>

      <SectionHeader title="Reading" />
      <View
        style={[
          styles.cardGroup,
          { backgroundColor: colors.card, borderCurve: "continuous" },
        ]}
      >
        <View style={styles.rowOuter}>
          <Link
            asChild
            href="/dashboard/settings/reader-settings"
            style={styles.flex1}
          >
            <Pressable style={styles.pressableRow}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                Reader Text Settings
              </Text>
              <ChevronRight />
            </Pressable>
          </Link>
        </View>
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.rowOuter}>
          <Text style={styles.flex1} numberOfLines={1}>
            Show notes in bookmark card
          </Text>
          <Switch
            style={styles.shrink0}
            value={settings.showNotes}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                showNotes: value,
              })
            }
          />
        </View>
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.rowOuter}>
          <Link
            asChild
            href="/dashboard/settings/toolbar-settings"
            style={styles.flex1}
          >
            <Pressable style={styles.pressableRowBetween}>
              <Text>Toolbar Buttons</Text>
              <ChevronRight />
            </Pressable>
          </Link>
        </View>
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.rowOuter}>
          <Text style={styles.flex1} numberOfLines={1}>
            Keep screen on while reading
          </Text>
          <Switch
            style={styles.shrink0}
            disabled={isSettingsLoading}
            value={settings.keepScreenOnWhileReading}
            onValueChange={(value) => {
              if (isSettingsLoading) return;
              setSettings({
                ...settings,
                keepScreenOnWhileReading: value,
              });
            }}
          />
        </View>
      </View>

      <SectionHeader title="Media" />
      <View
        style={[
          styles.cardGroup,
          { backgroundColor: colors.card, borderCurve: "continuous" },
        ]}
      >
        <View style={styles.mediaInner}>
          <View style={styles.mediaTopRow}>
            <Text>Upload Image Quality</Text>
            <Text style={{ color: colors.foreground }}>
              {Math.round(imageQuality ?? 0)}%
            </Text>
          </View>
          {imageQuality === null ? (
            <ActivityIndicator size="small" />
          ) : (
            <Slider
              style={{ height: 40, width: "100%" }}
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
      </View>

      <SectionHeader title="Account" />
      <View
        style={[
          styles.cardGroup,
          { backgroundColor: colors.card, borderCurve: "continuous" },
        ]}
      >
        <Pressable style={styles.accountRow} onPress={logout}>
          <Text style={[styles.flex1, { color: colors.destructive }]}>
            Log Out
          </Text>
        </Pressable>
        <Divider orientation="horizontal" style={styles.divider} />
        <Pressable
          style={styles.accountRow}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={[styles.flex1, { color: colors.destructive }]}>
              Delete Account
            </Text>
          )}
        </Pressable>
      </View>

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

      <SectionHeader title="About" />
      <View
        style={[
          styles.cardGroup,
          { backgroundColor: colors.card, borderCurve: "continuous" },
        ]}
      >
        <View style={styles.aboutRow}>
          <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
            Server
          </Text>
          <Text
            style={[styles.aboutValue, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {isSettingsLoading ? "Loading..." : settings.address}
          </Text>
        </View>
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
            App Version
          </Text>
          <Text
            style={[styles.aboutValue, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {Constants.expoConfig?.version ?? "unknown"}
          </Text>
        </View>
        <Divider orientation="horizontal" style={styles.divider} />
        <View style={styles.aboutRow}>
          <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
            Server Version
          </Text>
          <Text
            style={[styles.aboutValue, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {isServerVersionLoading
              ? "Loading..."
              : serverVersionError
                ? "unavailable"
                : (serverVersion ?? "unknown")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 16,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardGroup: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 8,
  },
  rowOuter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pressableRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pressableRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: {
    marginRight: 8,
    flex: 1,
  },
  rowValue: {
    marginRight: 4,
  },
  divider: {
    marginHorizontal: 24,
    marginVertical: 4,
  },
  flex1: {
    flex: 1,
  },
  shrink0: {
    flexShrink: 0,
  },
  mediaInner: {
    flexDirection: "column",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
  },
  mediaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  aboutValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
  },
});
