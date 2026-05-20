import * as React from "react";
import { Appearance, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import useAppSettings from "@/lib/settings";
import { COLORS, ThemeColors } from "@/theme/colors";

type Scheme = "light" | "dark";

function resolveScheme(
  themePref: "light" | "dark" | "system",
  systemScheme: Scheme,
): Scheme {
  if (themePref === "system") return systemScheme;
  return themePref;
}

function useColorScheme() {
  const { settings, isLoading } = useAppSettings();
  const [systemScheme, setSystemScheme] = React.useState<Scheme>(
    (Appearance.getColorScheme() ?? "light") as Scheme,
  );

  React.useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme ?? "light") as Scheme);
    });
    return () => sub.remove();
  }, []);

  const colorScheme: Scheme = isLoading
    ? systemScheme
    : resolveScheme(settings.theme, systemScheme);

  React.useEffect(() => {
    if (Platform.OS === "android") {
      setNavigationBar(colorScheme).catch((error) => {
        console.error('useColorScheme.tsx", "setColorScheme', error);
      });
    }
  }, [colorScheme]);

  return {
    colorScheme,
    isDarkColorScheme: colorScheme === "dark",
    colors: COLORS[colorScheme] as ThemeColors,
  };
}

/**
 * Set the Android navigation bar color based on the color scheme.
 */
function useInitialAndroidBarSync() {
  const { colorScheme } = useColorScheme();
  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    setNavigationBar(colorScheme).catch((error) => {
      console.error('useColorScheme.tsx", "useInitialColorScheme', error);
    });
  }, []);
}

export { useColorScheme, useInitialAndroidBarSync };

function setNavigationBar(colorScheme: "light" | "dark") {
  return NavigationBar.setButtonStyleAsync(
    colorScheme === "dark" ? "light" : "dark",
  );
}
