const SEMANTIC_COLORS = {
  light: {
    background: "rgb(242, 242, 247)",
    foreground: "rgb(0, 0, 0)",
    card: "rgb(255, 255, 255)",
    cardForeground: "rgb(0, 0, 0)",
    popover: "rgb(230, 230, 235)",
    popoverForeground: "rgb(0, 0, 0)",
    primary: "rgb(0, 123, 255)",
    primaryForeground: "rgb(255, 255, 255)",
    secondary: "rgb(45, 185, 227)",
    secondaryForeground: "rgb(255, 255, 255)",
    muted: "rgb(176, 176, 181)",
    mutedForeground: "rgb(102, 102, 102)",
    accent: "rgb(255, 40, 84)",
    accentForeground: "rgb(255, 255, 255)",
    destructive: "rgb(255, 56, 43)",
    destructiveForeground: "rgb(255, 255, 255)",
    border: "rgb(230, 230, 235)",
    input: "rgb(210, 210, 215)",
    ring: "rgb(230, 230, 235)",
  },
  dark: {
    background: "rgb(0, 0, 0)",
    foreground: "rgb(255, 255, 255)",
    card: "rgb(21, 21, 24)",
    cardForeground: "rgb(255, 255, 255)",
    popover: "rgb(40, 40, 40)",
    popoverForeground: "rgb(255, 255, 255)",
    primary: "rgb(3, 133, 255)",
    primaryForeground: "rgb(255, 255, 255)",
    secondary: "rgb(100, 211, 254)",
    secondaryForeground: "rgb(255, 255, 255)",
    muted: "rgb(112, 112, 115)",
    mutedForeground: "rgb(226, 226, 231)",
    accent: "rgb(255, 52, 95)",
    accentForeground: "rgb(255, 255, 255)",
    destructive: "rgb(254, 67, 54)",
    destructiveForeground: "rgb(255, 255, 255)",
    border: "rgb(40, 40, 40)",
    input: "rgb(51, 51, 51)",
    ring: "rgb(40, 40, 40)",
  },
} as const;

const GREYS = {
  light: {
    grey6: "rgb(242, 242, 247)",
    grey5: "rgb(230, 230, 235)",
    grey4: "rgb(210, 210, 215)",
    grey3: "rgb(199, 199, 204)",
    grey2: "rgb(176, 176, 181)",
    grey: "rgb(153, 153, 158)",
  },
  dark: {
    grey6: "rgb(21, 21, 24)",
    grey5: "rgb(40, 40, 40)",
    grey4: "rgb(51, 51, 51)",
    grey3: "rgb(70, 70, 70)",
    grey2: "rgb(99, 99, 99)",
    grey: "rgb(158, 158, 158)",
  },
} as const;

const COLORS = {
  white: "rgb(255, 255, 255)",
  black: "rgb(0, 0, 0)",
  light: {
    ...SEMANTIC_COLORS.light,
    ...GREYS.light,
    root: SEMANTIC_COLORS.light.background,
  },
  dark: {
    ...SEMANTIC_COLORS.dark,
    ...GREYS.dark,
    root: SEMANTIC_COLORS.dark.background,
  },
} as const;

export type ThemeColors = typeof COLORS.light;

export { COLORS };
