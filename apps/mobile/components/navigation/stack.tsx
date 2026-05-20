import { Platform, TextStyle, ViewStyle } from "react-native";
import { Stack } from "expo-router/stack";

interface StackProps extends React.ComponentProps<typeof Stack> {
  contentStyle?: ViewStyle;
  headerStyle?: TextStyle;
}

function StackImpl({ contentStyle, headerStyle, ...props }: StackProps) {
  props.screenOptions = {
    ...props.screenOptions,
    contentStyle,
    headerStyle: {
      backgroundColor: headerStyle?.backgroundColor?.toString(),
    },
    navigationBarColor:
      Platform.OS === "android"
        ? undefined
        : contentStyle?.backgroundColor?.toString(),
    headerTintColor: headerStyle?.color?.toString(),
  };
  return <Stack {...props} />;
}

// Changing this requires reloading the app
export const StyledStack = StackImpl;
