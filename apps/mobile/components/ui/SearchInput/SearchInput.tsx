import * as React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import { useColorScheme } from "@/lib/useColorScheme";
import { useAugmentedRef, useControllableState } from "@rn-primitives/hooks";
import { SearchIcon, XIcon } from "lucide-react-native";

import type { SearchInputProps } from "./types";

const SearchInput = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  SearchInputProps
>(
  (
    {
      value: valueProp,
      onChangeText: onChangeTextProp,
      placeholder = "Search...",
      containerStyle,
      iconContainerStyle,
      inputStyle,
      onCancel,
      ...props
    },
    ref,
  ) => {
    const { colors } = useColorScheme();
    const inputRef = useAugmentedRef({ ref, methods: { focus, blur, clear } });
    const [value = "", onChangeText] = useControllableState({
      prop: valueProp,
      defaultProp: valueProp ?? "",
      onChange: onChangeTextProp,
    });

    function focus() {
      inputRef.current?.focus();
    }

    function blur() {
      inputRef.current?.blur();
    }

    function clear() {
      onCancel?.();
      onChangeText("");
    }

    return (
      <Button
        variant="plain"
        style={[
          styles.container,
          { backgroundColor: colors.card },
          containerStyle,
        ]}
        onPress={focus}
      >
        <View
          style={[styles.iconWrap, iconContainerStyle]}
          pointerEvents="none"
        >
          <SearchIcon color={colors.muted} size={24} />
        </View>

        <View style={{ flex: 1 }} pointerEvents="none">
          <TextInput
            ref={inputRef}
            placeholder={placeholder}
            style={[styles.input, { color: colors.foreground }, inputStyle]}
            placeholderTextColor={colors.foreground}
            value={value}
            onChangeText={onChangeText}
            role="searchbox"
            {...props}
          />
        </View>
        {!!value && (
          <Animated.View entering={FadeIn} exiting={FadeOut.duration(150)}>
            <Pressable style={{ padding: 8 }} onPress={clear}>
              <XIcon size={24} color={colors.muted} />
            </Pressable>
          </Animated.View>
        )}
      </Button>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    height: 56,
    gap: 0,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    paddingHorizontal: 8,
  },
  iconWrap: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderTopRightRadius: 9999,
    borderBottomRightRadius: 9999,
    padding: 8,
    fontSize: 17,
  },
});

SearchInput.displayName = "SearchInput";

export { SearchInput };
