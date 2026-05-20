import * as React from "react";
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { TextStyleContext, withOpacity } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { COLORS, ThemeColors } from "@/theme/colors";
import * as Slot from "@rn-primitives/slot";

type Variant = "primary" | "secondary" | "tonal" | "plain" | "destructive";
type Size = "none" | "sm" | "md" | "lg" | "icon";

const BORDER_CURVE: ViewStyle = {
  borderCurve: "continuous",
};

function containerStyle(
  variant: Variant,
  size: Size,
  colors: ThemeColors,
): ViewStyle {
  const isIOS = Platform.OS === "ios";
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  let variantStyle: ViewStyle = {};
  switch (variant) {
    case "primary":
      variantStyle = { backgroundColor: colors.primary };
      break;
    case "secondary":
      variantStyle = {
        borderWidth: 1,
        borderColor: isIOS
          ? colors.primary
          : withOpacity(colors.foreground, 0.4),
      };
      break;
    case "tonal":
      variantStyle = {
        backgroundColor: isIOS
          ? withOpacity(colors.primary, 0.1)
          : withOpacity(colors.primary, 0.15),
      };
      break;
    case "plain":
      variantStyle = {};
      break;
    case "destructive":
      variantStyle = {
        backgroundColor: isIOS
          ? colors.destructive
          : withOpacity(colors.destructive, 0.8),
        borderWidth: 1,
        borderColor: withOpacity(colors.destructive, 0.05),
      };
      break;
  }

  let sizeStyle: ViewStyle = {};
  switch (size) {
    case "none":
      sizeStyle = {};
      break;
    case "sm":
      sizeStyle = {
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      };
      break;
    case "md":
      sizeStyle = isIOS
        ? { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }
        : { borderRadius: 9999, paddingHorizontal: 20, paddingVertical: 8 };
      break;
    case "lg":
      sizeStyle = isIOS
        ? {
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 8,
            gap: 8,
          }
        : {
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 10,
            gap: 8,
          };
      break;
    case "icon":
      sizeStyle = {
        height: 40,
        width: 40,
        borderRadius: isIOS ? 8 : 9999,
      };
      break;
  }

  return { ...base, ...variantStyle, ...sizeStyle };
}

function androidRootStyle(size: Size): ViewStyle {
  const base: ViewStyle = { overflow: "hidden" };
  switch (size) {
    case "icon":
    case "sm":
    case "md":
      return { ...base, borderRadius: 9999 };
    case "lg":
      return { ...base, borderRadius: 12 };
    default:
      return base;
  }
}

function buttonTextStyle(variant: Variant, size: Size): TextStyle {
  const base: TextStyle = { fontWeight: "500" };
  let sizeStyle: TextStyle = {};
  switch (size) {
    case "sm":
      sizeStyle = { fontSize: 15, lineHeight: 20 };
      break;
    case "md":
    case "lg":
      sizeStyle = { fontSize: 17, lineHeight: 28 };
      break;
  }
  return { ...base, ...sizeStyle };
}

function buttonTextColor(variant: Variant, colors: ThemeColors): TextStyle {
  const isIOS = Platform.OS === "ios";
  switch (variant) {
    case "primary":
    case "destructive":
      return { color: "#fff" };
    case "secondary":
    case "tonal":
      return { color: isIOS ? colors.primary : colors.foreground };
    case "plain":
      return { color: colors.foreground };
  }
}

function convertToRGBA(rgb: string, opacity: number): string {
  const rgbValues = rgb.match(/\d+/g);
  if (!rgbValues || rgbValues.length !== 3) {
    throw new Error("Invalid RGB color format");
  }
  const red = parseInt(rgbValues[0], 10);
  const green = parseInt(rgbValues[1], 10);
  const blue = parseInt(rgbValues[2], 10);
  return `rgba(${red},${green},${blue},${opacity})`;
}

const ANDROID_RIPPLE = {
  dark: {
    primary: {
      color: convertToRGBA(COLORS.dark.grey3, 0.4),
      borderless: false,
    },
    secondary: {
      color: convertToRGBA(COLORS.dark.grey5, 0.8),
      borderless: false,
    },
    plain: { color: convertToRGBA(COLORS.dark.grey5, 0.8), borderless: false },
    tonal: { color: convertToRGBA(COLORS.dark.grey5, 0.8), borderless: false },
    destructive: {
      color: convertToRGBA(COLORS.dark.destructive, 0.8),
      borderless: false,
    },
  },
  light: {
    primary: {
      color: convertToRGBA(COLORS.light.grey4, 0.4),
      borderless: false,
    },
    secondary: {
      color: convertToRGBA(COLORS.light.grey5, 0.4),
      borderless: false,
    },
    plain: { color: convertToRGBA(COLORS.light.grey5, 0.4), borderless: false },
    tonal: { color: convertToRGBA(COLORS.light.grey6, 0.4), borderless: false },
    destructive: {
      color: convertToRGBA(COLORS.light.destructive, 0.4),
      borderless: false,
    },
  },
};

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  androidRootStyle?: StyleProp<ViewStyle>;
}

const Root = Platform.OS === "android" ? View : Slot.Pressable;

const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(
  (
    {
      variant = "primary",
      size = "md",
      style = BORDER_CURVE,
      androidRootStyle: androidRootStyleProp,
      ...props
    },
    ref,
  ) => {
    const { colorScheme, colors } = useColorScheme();
    const containerSty = containerStyle(variant, size, colors);
    const txtSty = buttonTextStyle(variant, size);
    const txtColor = buttonTextColor(variant, colors);

    const rootSty: StyleProp<ViewStyle> =
      Platform.OS === "android"
        ? [androidRootStyle(size), androidRootStyleProp]
        : androidRootStyleProp;

    return (
      <TextStyleContext.Provider value={{ style: [txtSty, txtColor] }}>
        <Root style={rootSty}>
          <Pressable
            ref={ref}
            style={(state) => [
              containerSty,
              props.disabled && { opacity: 0.5 },
              typeof style === "function" ? style(state) : style,
            ]}
            android_ripple={ANDROID_RIPPLE[colorScheme][variant]}
            {...props}
          />
        </Root>
      </TextStyleContext.Provider>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, Variant as ButtonVariant, Size as ButtonSize };
