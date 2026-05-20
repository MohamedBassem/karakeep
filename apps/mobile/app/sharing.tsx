import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import ErrorAnimation from "@/components/sharing/ErrorAnimation";
import LoadingAnimation from "@/components/sharing/LoadingAnimation";
import SuccessAnimation from "@/components/sharing/SuccessAnimation";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { useUploadAsset } from "@/lib/upload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

type Mode =
  | { type: "idle" }
  | { type: "success"; bookmarkId: string }
  | { type: "alreadyExists"; bookmarkId: string }
  | { type: "error" };

function SaveBookmark({ setMode }: { setMode: (mode: Mode) => void }) {
  const api = useTRPC();
  const queryClient = useQueryClient();

  const onSaved = (d: ZBookmark & { alreadyExists: boolean }) => {
    queryClient.invalidateQueries(api.bookmarks.getBookmarks.pathFilter());
    setMode({
      type: d.alreadyExists ? "alreadyExists" : "success",
      bookmarkId: d.id,
    });
  };

  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();
  const { settings, isLoading } = useAppSettings();
  const { uploadAsset } = useUploadAsset(settings, {
    onSuccess: onSaved,
    onError: () => {
      setMode({ type: "error" });
    },
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isPending && shareIntent.webUrl) {
      mutate({
        type: BookmarkTypes.LINK,
        url: shareIntent.webUrl,
        source: "mobile",
      });
    } else if (!isPending && shareIntent?.text) {
      const val = z.string().url();
      if (val.safeParse(shareIntent.text).success) {
        // This is a URL, else treated as text
        mutate({
          type: BookmarkTypes.LINK,
          url: shareIntent.text,
          source: "mobile",
        });
      } else {
        mutate({
          type: BookmarkTypes.TEXT,
          text: shareIntent.text,
          source: "mobile",
        });
      }
    } else if (!isPending && shareIntent?.files) {
      uploadAsset({
        type: shareIntent.files[0].mimeType,
        name: shareIntent.files[0].fileName ?? "",
        uri: shareIntent.files[0].path,
      });
    }
    if (hasShareIntent) {
      resetShareIntent();
    }
  }, [isLoading]);

  const { mutate, isPending } = useMutation(
    api.bookmarks.createBookmark.mutationOptions({
      onSuccess: onSaved,
      onError: () => {
        setMode({ type: "error" });
      },
    }),
  );

  return null;
}

export default function Sharing() {
  const router = useRouter();
  const { colors } = useColorScheme();
  const [mode, setMode] = useState<Mode>({ type: "idle" });

  const autoCloseTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto dismiss the modal after saving.
  useEffect(() => {
    if (mode.type === "idle") {
      return;
    }

    autoCloseTimeoutId.current = setTimeout(
      () => {
        router.replace("dashboard");
      },
      mode.type === "error" ? 3000 : 2500,
    );

    return () => {
      if (autoCloseTimeoutId.current) {
        clearTimeout(autoCloseTimeoutId.current);
      }
    };
  }, [mode.type]);

  const handleManage = () => {
    if (mode.type === "success" || mode.type === "alreadyExists") {
      router.replace(`/dashboard/bookmarks/${mode.bookmarkId}/info`);
      if (autoCloseTimeoutId.current) {
        clearTimeout(autoCloseTimeoutId.current);
      }
    }
  };

  const handleDismiss = () => {
    if (autoCloseTimeoutId.current) {
      clearTimeout(autoCloseTimeoutId.current);
    }
    router.replace("dashboard");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Hidden component that handles the save logic */}
      {mode.type === "idle" && <SaveBookmark setMode={setMode} />}

      {/* Loading State */}
      {mode.type === "idle" && <LoadingAnimation />}

      {/* Success State */}
      {(mode.type === "success" || mode.type === "alreadyExists") && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.stateContainer}
        >
          <SuccessAnimation isAlreadyExists={mode.type === "alreadyExists"} />

          <Animated.View
            entering={FadeIn.delay(400).duration(300)}
            style={styles.textGroup}
          >
            <Text
              variant="title1"
              style={[styles.titleText, { color: colors.foreground }]}
            >
              {mode.type === "alreadyExists" ? "Already Hoarded!" : "Hoarded!"}
            </Text>
            <Text variant="body" style={{ color: colors.mutedForeground }}>
              {mode.type === "alreadyExists"
                ? "This item was saved before"
                : "Saved to your collection"}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(600).duration(300)}
            style={styles.buttonGroup}
          >
            <Button onPress={handleManage} variant="primary" size="lg">
              <Text
                style={[styles.manageText, { color: colors.primaryForeground }]}
              >
                Manage
              </Text>
            </Button>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={{ color: colors.mutedForeground }}>Dismiss</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}

      {/* Error State */}
      {mode.type === "error" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.stateContainer}
        >
          <ErrorAnimation />

          <Animated.View
            entering={FadeIn.delay(300).duration(300)}
            style={styles.textGroup}
          >
            <Text
              variant="title1"
              style={[styles.titleText, { color: colors.foreground }]}
            >
              Oops!
            </Text>
            <Text variant="body" style={{ color: colors.mutedForeground }}>
              Something went wrong
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(500).duration(300)}
            style={styles.buttonGroup}
          >
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={{ color: colors.mutedForeground }}>Dismiss</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stateContainer: {
    alignItems: "center",
    gap: 24,
  },
  textGroup: {
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    fontWeight: "600",
  },
  buttonGroup: {
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
  },
  manageText: {
    fontWeight: "500",
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
