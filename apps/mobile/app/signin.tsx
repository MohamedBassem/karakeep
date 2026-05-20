import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import useAppSettings from "@/lib/settings";
import { useColorScheme } from "@/lib/useColorScheme";
import { useMutation } from "@tanstack/react-query";
import { Bug, Edit3 } from "lucide-react-native";

import { useTRPC } from "@karakeep/shared-react/trpc";

enum LoginType {
  Password,
  ApiKey,
}

export default function Signin() {
  const { settings, setSettings } = useAppSettings();
  const router = useRouter();
  const api = useTRPC();
  const { colors } = useColorScheme();
  const [error, setError] = useState<string | undefined>();
  const [loginType, setLoginType] = useState<LoginType>(LoginType.Password);

  const emailRef = useRef<string>("");
  const passwordRef = useRef<string>("");
  const apiKeyRef = useRef<string>("");

  const toggleLoginType = () => {
    setLoginType((prev) => {
      if (prev === LoginType.Password) {
        return LoginType.ApiKey;
      } else {
        return LoginType.Password;
      }
    });
  };

  const { mutate: login, isPending: userNamePasswordRequestIsPending } =
    useMutation(
      api.apiKeys.exchange.mutationOptions({
        onSuccess: (resp) => {
          setSettings({ ...settings, apiKey: resp.key, apiKeyId: resp.id });
        },
        onError: (e) => {
          if (e.data?.code === "UNAUTHORIZED") {
            setError("Wrong username or password");
          } else {
            setError(`${e.message}`);
          }
        },
      }),
    );

  const { mutate: validateApiKey, isPending: apiKeyValueRequestIsPending } =
    useMutation(
      api.apiKeys.validate.mutationOptions({
        onSuccess: () => {
          const apiKey = apiKeyRef.current;
          setSettings({ ...settings, apiKey: apiKey });
        },
        onError: (e) => {
          if (e.data?.code === "UNAUTHORIZED") {
            setError("Invalid API key");
          } else {
            setError(`${e.message}`);
          }
        },
      }),
    );

  if (settings.apiKey) {
    return <Redirect href="dashboard" />;
  }

  const onSignUp = async () => {
    const serverAddress = settings.address ?? "https://cloud.karakeep.app";
    const signupUrl = `${serverAddress}/signup?redirectUrl=${encodeURIComponent("karakeep://signin")}&skipSessionRedirect=1`;

    await WebBrowser.openAuthSessionAsync(signupUrl, "karakeep://signin");
  };

  const onSignin = () => {
    if (!settings.address) {
      setError("Server address is required");
      return;
    }

    if (
      !settings.address.startsWith("http://") &&
      !settings.address.startsWith("https://")
    ) {
      setError("Server address must start with http:// or https://");
      return;
    }

    if (loginType === LoginType.Password) {
      const email = emailRef.current;
      const password = passwordRef.current;

      const randStr = (Math.random() + 1).toString(36).substring(5);
      login({
        email: email.trim(),
        password: password,
        keyName: `Mobile App: (${randStr})`,
      });
    } else if (loginType === LoginType.ApiKey) {
      const apiKey = apiKeyRef.current;
      validateApiKey({ apiKey: apiKey });
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.logoWrapper}>
            <Logo height={150} width={250} fill={colors.foreground} />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.fieldGroup}>
            <Text style={styles.boldText}>Server Address</Text>
            <View style={styles.row}>
              <View
                style={[
                  styles.addressBox,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <Text>{settings.address ?? "https://cloud.karakeep.app"}</Text>
              </View>
              <Button
                size="icon"
                variant="secondary"
                onPress={() => router.push("/server-address")}
              >
                <Edit3 size={16} color={colors.foreground} />
              </Button>
            </View>
          </View>
          {loginType === LoginType.Password && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.boldText}>Email</Text>
                <Input
                  style={styles.fullWidth}
                  inputStyle={{ backgroundColor: colors.card }}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  defaultValue={""}
                  onChangeText={(text) => (emailRef.current = text)}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.boldText}>Password</Text>
                <Input
                  style={styles.fullWidth}
                  inputStyle={{ backgroundColor: colors.card }}
                  placeholder="Password"
                  secureTextEntry
                  defaultValue={""}
                  autoCapitalize="none"
                  textContentType="password"
                  onChangeText={(text) => (passwordRef.current = text)}
                />
              </View>
            </>
          )}

          {loginType === LoginType.ApiKey && (
            <View style={styles.fieldGroup}>
              <Text style={styles.boldText}>API Key</Text>
              <Input
                style={styles.fullWidth}
                inputStyle={{ backgroundColor: colors.card }}
                placeholder="API Key"
                secureTextEntry
                defaultValue={""}
                autoCapitalize="none"
                textContentType="password"
                onChangeText={(text) => (apiKeyRef.current = text)}
              />
            </View>
          )}

          <View style={styles.actionsRow}>
            <Button
              size="lg"
              androidRootStyle={{ flex: 1 }}
              onPress={onSignin}
              disabled={
                userNamePasswordRequestIsPending || apiKeyValueRequestIsPending
              }
            >
              <Text>Sign In</Text>
            </Button>
            <Button
              size="icon"
              onPress={() => router.push("/test-connection")}
              disabled={!settings.address}
            >
              <Bug size={20} color="#fff" />
            </Button>
          </View>
          <Pressable onPress={toggleLoginType}>
            <Text style={styles.toggleText}>
              {loginType === LoginType.Password
                ? "Use API key instead?"
                : "Use password instead?"}
            </Text>
          </Pressable>
          <Pressable onPress={onSignUp}>
            <Text style={styles.signupText}>
              Don&apos;t have an account?{" "}
              <Text style={[styles.signupLink, { color: colors.foreground }]}>
                Sign Up
              </Text>
            </Text>
          </Pressable>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  logoWrapper: {
    alignItems: "center",
  },
  errorText: {
    width: "100%",
    textAlign: "center",
    color: "#ef4444",
  },
  fieldGroup: {
    gap: 8,
  },
  boldText: {
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressBox: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fullWidth: {
    width: "100%",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleText: {
    marginTop: 8,
    textAlign: "center",
    color: "#6b7280",
  },
  signupText: {
    marginTop: 16,
    textAlign: "center",
    color: "#6b7280",
  },
  signupLink: {
    textDecorationLine: "underline",
  },
});
