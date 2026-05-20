import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Text, withOpacity } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Trash2 } from "lucide-react-native";

import type { ZHighlight } from "@karakeep/shared/types/highlights";
import { useDeleteHighlight } from "@karakeep/shared-react/hooks/highlights";
import { useTRPC } from "@karakeep/shared-react/trpc";

import { useToast } from "../ui/Toast";

// Color map for highlights (mapped to Tailwind CSS classes used in NativeWind)
const HIGHLIGHT_COLOR_MAP = {
  red: "#fecaca", // bg-red-200
  green: "#bbf7d0", // bg-green-200
  blue: "#bfdbfe", // bg-blue-200
  yellow: "#fef08a", // bg-yellow-200
} as const;

export default function HighlightCard({
  highlight,
}: {
  highlight: ZHighlight;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const api = useTRPC();
  const { colors } = useColorScheme();

  const onError = () => {
    toast({
      message: "Something went wrong",
      variant: "destructive",
      showProgress: false,
    });
  };

  const { mutate: deleteHighlight, isPending: isDeleting } = useDeleteHighlight(
    {
      onSuccess: () => {
        toast({
          message: "Highlight has been deleted!",
          showProgress: false,
        });
      },
      onError,
    },
  );

  const deleteHighlightAlert = () =>
    Alert.alert(
      "Delete highlight?",
      "Are you sure you want to delete this highlight?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => deleteHighlight({ highlightId: highlight.id }),
          style: "destructive",
        },
      ],
    );

  const { data: bookmark } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId: highlight.bookmarkId,
      },
      {
        retry: false,
      },
    ),
  );

  const handleBookmarkPress = () => {
    Haptics.selectionAsync();
    router.push(`/dashboard/bookmarks/${highlight.bookmarkId}`);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderCurve: "continuous" },
      ]}
    >
      <View style={styles.body}>
        {/* Highlight text with colored border */}
        <View
          style={[
            styles.highlightBlock,
            {
              backgroundColor: withOpacity(colors.muted, 0.3),
              borderLeftColor: HIGHLIGHT_COLOR_MAP[highlight.color],
            },
          ]}
        >
          <Text style={{ fontStyle: "italic", color: colors.foreground }}>
            {highlight.text || "No text available"}
          </Text>
        </View>

        {/* Note if present */}
        {highlight.note && (
          <View
            style={[
              styles.noteBlock,
              { backgroundColor: withOpacity(colors.muted, 0.5) },
            ]}
          >
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
              Note: {highlight.note}
            </Text>
          </View>
        )}

        {/* Footer with timestamp and actions */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {formatDistanceToNow(highlight.createdAt, { addSuffix: true })}
            </Text>
            {bookmark && (
              <>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  •
                </Text>
                <Pressable
                  onPress={handleBookmarkPress}
                  style={styles.sourceLink}
                >
                  <ExternalLink size={12} color="gray" />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    Source
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.actions}>
            {isDeleting ? (
              <ActivityIndicator size="small" />
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  deleteHighlightAlert();
                }}
              >
                <Trash2 size={18} color="#ef4444" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 12,
    padding: 16,
  },
  body: {
    gap: 12,
  },
  highlightBlock: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
  },
  noteBlock: {
    borderRadius: 8,
    padding: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
});
