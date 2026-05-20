import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useColorScheme } from "@/lib/useColorScheme";
import { Plus, Trash2, X } from "lucide-react-native";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Text } from "./ui/Text";

interface CustomHeadersModalProps {
  visible: boolean;
  customHeaders: Record<string, string>;
  onClose: () => void;
  onSave: (headers: Record<string, string>) => void;
}

export function CustomHeadersModal({
  visible,
  customHeaders,
  onClose,
  onSave,
}: CustomHeadersModalProps) {
  const { isDarkColorScheme, colors } = useColorScheme();
  const iconColor = isDarkColorScheme ? "#d1d5db" : "#374151";
  const secondaryTextColor = isDarkColorScheme ? "#9ca3af" : "#4b5563";
  const placeholderTextColor = isDarkColorScheme ? "#9ca3af" : "#6b7280";

  // Convert headers object to array of entries for easier manipulation
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    Object.entries(customHeaders).map(([key, value]) => ({ key, value })),
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
    // Convert array back to object
    const headersObject = headers.reduce(
      (acc, { key, value }) => {
        if (key.trim() && value.trim()) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    onSave(headersObject);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original headers
    setHeaders(
      Object.entries(customHeaders).map(([key, value]) => ({ key, value })),
    );
    setNewHeaderKey("");
    setNewHeaderValue("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContent}
            bottomOffset={20}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>Custom Headers</Text>
              <Pressable onPress={handleCancel} style={styles.iconButton}>
                <X size={24} color={iconColor} />
              </Pressable>
            </View>

            <Text style={[styles.description, { color: secondaryTextColor }]}>
              Add custom HTTP headers that will be sent with every API request.
            </Text>

            {/* Existing Headers List */}
            <View style={styles.list}>
              {headers.length === 0 ? (
                <Text
                  style={[styles.emptyText, { color: placeholderTextColor }]}
                >
                  No custom headers configured
                </Text>
              ) : (
                <ScrollView>
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
                      <View style={styles.headerItemContent}>
                        <Text style={styles.headerKey}>{header.key}</Text>
                        <Text
                          style={[
                            styles.headerValue,
                            { color: secondaryTextColor },
                          ]}
                          numberOfLines={1}
                        >
                          {header.value}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveHeader(index)}
                        style={styles.iconButton}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Add New Header */}
            <View
              style={[styles.addSection, { borderTopColor: colors.border }]}
            >
              <Text style={styles.sectionTitle}>Add New Header</Text>
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
                <Text style={styles.buttonText}>Add Header</Text>
              </Button>
            </View>

            {/* Action Buttons */}
            <View
              style={[styles.actionsRow, { borderTopColor: colors.border }]}
            >
              <Button
                variant="secondary"
                onPress={handleCancel}
                androidRootStyle={{ flex: 1 }}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                androidRootStyle={{ flex: 1 }}
              >
                <Text>Save</Text>
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: 24,
  },
  headerRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  iconButton: {
    padding: 8,
  },
  description: {
    marginBottom: 16,
    fontSize: 14,
  },
  list: {
    marginBottom: 16,
    maxHeight: 256,
  },
  emptyText: {
    paddingVertical: 16,
    textAlign: "center",
    fontSize: 14,
  },
  headerItem: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  headerItemContent: {
    flex: 1,
  },
  headerKey: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerValue: {
    fontSize: 12,
  },
  addSection: {
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  buttonText: {
    fontSize: 14,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
});
