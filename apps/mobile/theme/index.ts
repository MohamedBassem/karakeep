import { DarkTheme, DefaultTheme } from "@react-navigation/native";

import { COLORS } from "./colors";

const NAV_THEME = {
  light: {
    ...DefaultTheme,
    colors: {
      background: COLORS.light.background,
      border: COLORS.light.border,
      card: COLORS.light.background,
      notification: COLORS.light.destructive,
      primary: COLORS.light.primary,
      text: COLORS.black,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: COLORS.dark.background,
      border: COLORS.dark.border,
      card: COLORS.dark.grey6,
      notification: COLORS.dark.destructive,
      primary: COLORS.dark.primary,
      text: COLORS.white,
    },
  },
};

export { NAV_THEME };
