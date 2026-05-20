import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { Plus, Trash2 } from "lucide-react-native";

export default function ServerAddress() {
  const router = useRouter();
  const { colorScheme, isDarkColorScheme, colors } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#d1d5db" : "#374151";
  const { settings, setSettings } = useAppSettings();
  const [address, setAddress] = useState(
    settings.address ?? "https://cloud.karakeep.app",
  );
  const [error, setError] = useState<string | undefined>();

  // Custom headers state
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    Object.entries(settings.customHeaders || {}).map(([key, value]) => ({
      key,
      value,
    })),
  );
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  const handleAddHeader = () => {
    if (!newHeaderKey.trim() || !newHeaderValue.trim()) {
      return;
    }

    // Check if header already exists
    const existingIndex = headers.findIndex((h) => h.key === newHeaderKey);
    if (existingIndex >= 0) {
      // Update existing header
      const updatedHeaders = [...headers];
      updatedHeaders[existingIndex].value = newHeaderValue;
      setHeaders(updatedHeaders);
    } else {
      // Add new header
      setHeaders([...headers, { key: newHeaderKey, value: newHeaderValue }]);
    }

    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Validate the address
    if (!address.trim()) {
      setError("Server address is required");
      return;
    }

    if (!address.startsWith("http://") && !address.startsWith("https://")) {
      setError("Server address must start with http:// or https://");
      return;
    }

    // Convert headers array to object
    const headersObject = headers.reduce(
      (acc, { key, value }) => {
        if (key.trim() && value.trim()) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    // Remove trailing slash and save
    const cleanedAddress = address.trim().replace(/\/$/, "");
    setSettings({
      ...settings,
      address: cleanedAddress,
      customHeaders: headersObject,
    });
    router.back();
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContent}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Error Message */}
      {error && (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: isDarkColorScheme ? "#450a0a" : "#fef2f2" },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              { color: isDarkColorScheme ? "#f87171" : "#dc2626" },
            ]}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Server Address Section */}
      <View style={styles.fullWidth}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Server URL
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
            Enter the URL of your Karakeep server
          </Text>
          <Input
            placeholder="https://cloud.karakeep.app"
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setError(undefined);
            }}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
            inputStyle={{ backgroundColor: colors.background }}
          />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Must start with http:// or https://
          </Text>
        </View>
      </View>

      {/* Custom Headers Section */}
      <View style={styles.fullWidth}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Custom Headers
          {headers.length > 0 && (
            <Text style={{ color: colors.mutedForeground }}>
              {" "}
              ({headers.length})
            </Text>
          )}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
            Add custom HTTP headers for API requests
          </Text>

          {/* Existing Headers List */}
          {headers.length === 0 ? (
            <View style={styles.emptyHeaders}>
              <Text
                style={[
                  styles.emptyHeadersText,
                  { color: colors.mutedForeground },
                ]}
              >
                No custom headers configured
              </Text>
            </View>
          ) : (
            <View style={styles.headersList}>
              {headers.map((header, index) => (
                <View
                  key={index}
                  style={[
                    styles.headerItem,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <View style={styles.headerInfo}>
                    <Text style={styles.headerKey}>{header.key}</Text>
                    <Text
                      style={[
                        styles.headerValue,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {header.value}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveHeader(index)}
                    style={styles.removeButton}
                    hitSlop={8}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Add New Header Form */}
          <View style={[styles.addHeaderForm, { borderColor: colors.border }]}>
            <Text style={styles.addHeaderLabel}>Add New Header</Text>
            <Input
              placeholder="Header Name (e.g., X-Custom-Header)"
              value={newHeaderKey}
              onChangeText={setNewHeaderKey}
              autoCapitalize="none"
              inputStyle={{ backgroundColor: colors.background }}
            />
            <Input
              placeholder="Header Value"
              value={newHeaderValue}
              onChangeText={setNewHeaderValue}
              autoCapitalize="none"
              inputStyle={{ backgroundColor: colors.background }}
            />
            <Button
              variant="secondary"
              onPress={handleAddHeader}
              disabled={!newHeaderKey.trim() || !newHeaderValue.trim()}
            >
              <Plus size={16} color={iconColor} />
              <Text style={styles.addHeaderButtonText}>Add Header</Text>
            </Button>
          </View>
        </View>
      </View>
      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fullWidth: {
    width: "100%",
  },
  errorBox: {
    width: "100%",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
  },
  sectionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    width: "100%",
    gap: 12,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  helpText: {
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
  },
  emptyHeaders: {
    paddingVertical: 16,
  },
  emptyHeadersText: {
    textAlign: "center",
    fontSize: 14,
  },
  headersList: {
    gap: 8,
  },
  headerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  headerKey: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerValue: {
    fontSize: 12,
  },
  removeButton: {
    borderRadius: 6,
    padding: 8,
  },
  addHeaderForm: {
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  addHeaderLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  addHeaderButtonText: {
    fontSize: 14,
  },
  saveButton: {
    width: "100%",
    alignItems: "center",
  },
  saveText: {
    fontWeight: "600",
  },
});
