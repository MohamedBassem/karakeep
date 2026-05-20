import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "@/lib/useColorScheme";
import { ExternalLink, NotepadText, X } from "lucide-react-native";

import { Button } from "../ui/Button";
import { Text } from "../ui/Text";

interface NotePreviewProps {
  note: string;
  bookmarkId: string;
  readOnly?: boolean;
}

export function NotePreview({
  note,
  bookmarkId,
  readOnly = false,
}: NotePreviewProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { isDarkColorScheme, colors } = useColorScheme();
  const iconColor = isDarkColorScheme ? "#9ca3af" : "#6b7280";
  const modalIconColor = isDarkColorScheme ? "#d1d5db" : "#374151";
  const noteTextColor = isDarkColorScheme ? "#d1d5db" : "#374151";

  if (!note?.trim()) {
    return null;
  }

  return (
    <>
      <Pressable onPress={() => setIsModalVisible(true)}>
        <View style={styles.previewRow}>
          <NotepadText size={24} color={iconColor} />
          <Text
            style={[styles.previewText, { color: "#6b7280" }]}
            numberOfLines={2}
          >
            {note}
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Note</Text>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={modalIconColor} />
              </Pressable>
            </View>

            {/* Note Content */}
            <ScrollView style={styles.noteScroll}>
              <Text style={[styles.noteContent, { color: noteTextColor }]}>
                {note}
              </Text>
            </ScrollView>

            {/* Action Button */}
            {!readOnly && (
              <View
                style={[styles.actionRow, { borderTopColor: colors.border }]}
              >
                <Button
                  variant="secondary"
                  onPress={() => {
                    setIsModalVisible(false);
                    router.push(`/dashboard/bookmarks/${bookmarkId}/info`);
                  }}
                >
                  <Text style={{ fontSize: 14 }}>Edit Notes</Text>
                  <ExternalLink size={14} color={modalIconColor} />
                </Button>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    maxHeight: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  noteScroll: {
    marginBottom: 16,
    maxHeight: 384,
  },
  noteContent: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    paddingTop: 16,
  },
});
