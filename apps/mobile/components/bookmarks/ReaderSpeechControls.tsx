import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  View,
} from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Speech from "expo-speech";
import { MenuView } from "@react-native-menu/menu";
import { Pause, Play, X } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import {
  initialSpeechState,
  ReaderSpeechController,
  ReaderSpeechStatus,
} from "@/lib/readerSpeech";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const KEEP_AWAKE_TAG = "reader-speech";
const STATUS_LABELS: Record<ReaderSpeechStatus, string> = {
  idle: "Listen",
  loading: "Preparing...",
  playing: "Pause",
  paused: "Resume",
  finished: "Read again",
};
const speechEngine = {
  maxSpeechInputLength: Speech.maxSpeechInputLength,
  speak: Speech.speak,
  stop: Speech.stop,
  ...(Platform.OS === "ios"
    ? { pause: Speech.pause, resume: Speech.resume }
    : {}),
};

export default function ReaderSpeechControls({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const { colors } = useColorScheme();
  const { settings, setSettings } = useAppSettings();
  const [state, setState] = useState(() =>
    initialSpeechState(settings.readerSpeechRate ?? 1),
  );
  const [player] = useState(
    () => new ReaderSpeechController(speechEngine, setState, state.rate),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") player.pause();
    });
    return () => {
      subscription.remove();
      player.stop();
    };
  }, [player]);
  useEffect(() => {
    player.setText(text);
    player.play();
  }, [player, text]);

  const isPlaying = state.status === "playing";
  const isLoading = state.status === "loading";
  // The app has no background audio, so a screen lock would pause playback.
  const speaking = isPlaying || isLoading;
  useEffect(() => {
    if (!speaking) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => void deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, [speaking]);

  const active = state.status !== "idle" && state.status !== "finished";
  return (
    <View className="border-b border-border bg-background">
      <View className="flex-row items-center gap-2 px-4">
        {!text.trim() ? (
          <Text className="flex-1" color="tertiary">
            No text to read aloud
          </Text>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={() => (isPlaying ? player.pause() : player.play())}
              className="min-h-12 flex-row items-center gap-2 pr-2 active:opacity-70"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isPlaying ? (
                <Pause size={18} color={colors.primary} />
              ) : (
                <Play size={18} color={colors.primary} />
              )}
              <Text className="text-primary">
                {STATUS_LABELS[state.status]}
              </Text>
            </Pressable>
            <View className="flex-1">
              {active && (
                <Text variant="caption1" color="tertiary">
                  {Math.round(state.progress * 100)}%
                </Text>
              )}
            </View>
            <MenuView
              title="Reading speed"
              actions={SPEEDS.map((speed) => ({
                id: String(speed),
                title: `${speed}×`,
                state: state.rate === speed ? "on" : "off",
              }))}
              onPressAction={({ nativeEvent }) => {
                const rate = Number(nativeEvent.event);
                player.setRate(rate);
                void setSettings({ ...settings, readerSpeechRate: rate });
              }}
            >
              <View
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Reading speed: ${state.rate} times`}
                className="min-h-12 min-w-11 items-center justify-center px-2"
              >
                <Text className="text-primary">{state.rate}×</Text>
              </View>
            </MenuView>
          </>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close read-aloud player"
          onPress={onClose}
          className="min-h-12 min-w-11 items-center justify-center active:opacity-70"
        >
          <X size={18} color={colors.primary} />
        </Pressable>
      </View>
      {state.error && (
        <Text
          accessibilityRole="alert"
          variant="footnote"
          className="px-4 pb-2 text-destructive"
        >
          {state.error}
        </Text>
      )}
      {active && (
        <View className="h-0.5 bg-border">
          <View
            className="h-0.5 bg-primary"
            style={{ width: `${state.progress * 100}%` }}
          />
        </View>
      )}
    </View>
  );
}
