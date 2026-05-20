import * as React from "react";
import { StyleSheet, Text as RNText, TextStyle } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";

type TextVariant =
  | "largeTitle"
  | "title1"
  | "title2"
  | "title3"
  | "heading"
  | "body"
  | "callout"
  | "subhead"
  | "footnote"
  | "caption1"
  | "caption2";

type TextColor = "primary" | "secondary" | "tertiary" | "quarternary";

const variantStyles: Record<TextVariant, TextStyle> = StyleSheet.create({
  largeTitle: { fontSize: 36 },
  title1: { fontSize: 24 },
  title2: { fontSize: 22, lineHeight: 28 },
  title3: { fontSize: 20 },
  heading: { fontSize: 17, fontWeight: "600", lineHeight: 24 },
  body: { fontSize: 17, lineHeight: 24 },
  callout: { fontSize: 16 },
  subhead: { fontSize: 15, lineHeight: 24 },
  footnote: { fontSize: 13, lineHeight: 20 },
  caption1: { fontSize: 12 },
  caption2: { fontSize: 11, lineHeight: 16 },
});

interface TextContextValue {
  style?: TextStyle | TextStyle[];
}

const TextStyleContext = React.createContext<TextContextValue>({});

interface TextProps extends React.ComponentPropsWithoutRef<typeof RNText> {
  variant?: TextVariant;
  color?: TextColor;
}

function Text({
  style,
  variant = "body",
  color = "primary",
  ...props
}: TextProps) {
  const { colors } = useColorScheme();
  const ctx = React.useContext(TextStyleContext);

  const colorValue: TextStyle =
    color === "primary"
      ? { color: colors.foreground }
      : color === "secondary"
        ? { color: withOpacity(colors.secondaryForeground, 0.9) }
        : color === "tertiary"
          ? { color: withOpacity(colors.mutedForeground, 0.9) }
          : { color: withOpacity(colors.mutedForeground, 0.5) };

  return (
    <RNText
      style={[variantStyles[variant], colorValue, ctx.style, style]}
      {...props}
    />
  );
}

function withOpacity(rgb: string, opacity: number) {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return rgb;
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${opacity})`;
}

export { Text, TextStyleContext, withOpacity };
export type { TextVariant, TextColor };
