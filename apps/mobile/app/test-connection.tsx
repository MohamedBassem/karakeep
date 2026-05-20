import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { Text, withOpacity } from "@/components/ui/Text";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { buildApiHeaders } from "@/lib/utils";
import { z } from "zod";

export default function TestConnection() {
  const { settings, isLoading } = useAppSettings();
  const { colors } = useColorScheme();
  const [text, setText] = React.useState("");
  const [randomId, setRandomId] = React.useState(Math.random());
  const [status, setStatus] = React.useState<"running" | "success" | "error">(
    "running",
  );

  const appendText = (text: string) => {
    setText((prev) => prev + (prev ? "\n\n" : "") + text);
  };

  React.useEffect(() => {
    if (isLoading) {
      return;
    }
    setStatus("running");
    appendText("Running connection test ...");
    function runTest() {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState !== 4) {
          return;
        }

        if (request.status === 0) {
          appendText("Network connection failed: " + request.responseText);
          setStatus("error");
          return;
        }

        if (request.status !== 200) {
          appendText("Recieve non success error code: " + request.status);
          appendText("Got the following response:");
          appendText(request.responseText);
          setStatus("error");
          return;
        }
        try {
          const schema = z.object({
            status: z.string(),
          });
          const data = schema.parse(JSON.parse(request.responseText));
          if (data.status !== "ok") {
            appendText(`Server is not healthy: ${data.status}`);
            setStatus("error");
            return;
          }
          appendText("ALL GOOD");
          setStatus("success");
        } catch (e) {
          appendText(`Failed to parse response as JSON: ${e}`);
          appendText("Got the following response:");
          appendText(request.responseText);
          setStatus("error");
          return;
        }
      };

      appendText("Using address: " + settings.address);
      request.open("GET", `${settings.address}/api/health`);
      const headers = buildApiHeaders(settings.apiKey, settings.customHeaders);
      Object.entries(headers).forEach(([key, value]) => {
        request.setRequestHeader(key, value);
      });
      request.send();
    }
    runTest();
  }, [settings.address, randomId]);

  const statusBg =
    status === "running"
      ? withOpacity(colors.primary, 0.5)
      : status === "success"
        ? "#22c55e"
        : "#ef4444";

  const statusColor = status === "running" ? colors.primaryForeground : "#fff";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.contentContainer}
    >
      <Button
        style={styles.fullWidth}
        onPress={async () => {
          await Clipboard.setStringAsync(text);
        }}
      >
        <Text>Copy Diagnostics Result</Text>
      </Button>
      <Button
        style={styles.fullWidth}
        variant="secondary"
        onPress={() => {
          setText("");
          setRandomId(Math.random());
        }}
      >
        <Text>Retry</Text>
      </Button>
      <View style={[styles.statusBox, { backgroundColor: statusBg }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {status === "running" && "Running connection test ..."}
          {status === "success" && "Connection test successful"}
          {status === "error" && "Connection test failed"}
        </Text>
      </View>
      <ScrollView
        style={[
          styles.logBox,
          { borderColor: colors.border, backgroundColor: colors.input },
        ]}
      >
        <Text
          style={{
            fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
          }}
        >
          {text}
        </Text>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    margin: 16,
    flex: 1,
    flexDirection: "column",
    gap: 8,
  },
  fullWidth: {
    width: "100%",
  },
  statusBox: {
    width: "100%",
    borderRadius: 6,
    padding: 8,
  },
  statusText: {
    width: "100%",
    textAlign: "center",
  },
  logBox: {
    height: 256,
    flex: 1,
    borderWidth: 1,
    padding: 8,
    lineHeight: 24,
  },
});
