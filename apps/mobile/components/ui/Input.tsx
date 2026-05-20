import type {
  StyleProp,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from "react-native";
import { forwardRef } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { withOpacity } from "@/components/ui/Text";

export interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  loading?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    { label, containerStyle, labelStyle, inputStyle, loading, style, ...props },
    ref,
  ) => {
    const { colors } = useColorScheme();
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
        <TextInput
          ref={ref}
          placeholderTextColor={withOpacity(colors.mutedForeground, 0.5)}
          style={[
            styles.input,
            {
              borderColor: colors.input,
              color: colors.foreground,
            },
            inputStyle,
            style,
          ]}
          {...props}
        />
        {loading && <ActivityIndicator style={styles.spinner} />}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 16,
  },
  input: {
    height: 40,
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  spinner: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 8,
  },
});
