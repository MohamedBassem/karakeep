import * as React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useAugmentedRef, useControllableState } from "@rn-primitives/hooks";
import { SearchIcon } from "lucide-react-native";

import type { SearchInputProps } from "./types";

const BORDER_CURVE: ViewStyle = {
  borderCurve: "continuous",
};

const SearchInput = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  SearchInputProps
>(
  (
    {
      value: valueProp,
      onChangeText: onChangeTextProp,
      onFocus: onFocusProp,
      placeholder = "Search...",
      cancelText = "Cancel",
      containerStyle,
      iconContainerStyle,
      inputStyle,
      iconColor: _iconColor,
      onCancel,
      ...props
    },
    ref,
  ) => {
    const { colors } = useColorScheme();
    const inputRef = useAugmentedRef({ ref, methods: { focus, blur, clear } });
    const [showCancel, setShowCancel] = React.useState(false);
    const showCancelDerivedValue = useDerivedValue(
      () => showCancel,
      [showCancel],
    );
    const animatedRef = useAnimatedRef();

    const [value = "", onChangeText] = useControllableState({
      prop: valueProp,
      defaultProp: valueProp ?? "",
      onChange: onChangeTextProp,
    });

    const rootStyle = useAnimatedStyle(() => {
      if (_WORKLET) {
        const measurement = measure(animatedRef);
        return {
          paddingRight: showCancelDerivedValue.value
            ? withTiming(measurement?.width ?? cancelText.length * 11.2)
            : withTiming(0),
        };
      }
      return {
        paddingRight: showCancelDerivedValue.value
          ? withTiming(cancelText.length * 11.2)
          : withTiming(0),
      };
    });
    const buttonStyle3 = useAnimatedStyle(() => {
      if (_WORKLET) {
        const measurement = measure(animatedRef);
        return {
          position: "absolute",
          right: 0,
          opacity: showCancelDerivedValue.value ? withTiming(1) : withTiming(0),
          transform: [
            {
              translateX: showCancelDerivedValue.value
                ? withTiming(0)
                : measurement?.width
                  ? withTiming(measurement.width)
                  : cancelText.length * 11.2,
            },
          ],
        };
      }
      return {
        position: "absolute",
        right: 0,
        opacity: showCancelDerivedValue.value ? withTiming(1) : withTiming(0),
        transform: [
          {
            translateX: showCancelDerivedValue.value
              ? withTiming(0)
              : withTiming(cancelText.length * 11.2),
          },
        ],
      };
    });

    function focus() {
      inputRef.current?.focus();
    }

    function blur() {
      inputRef.current?.blur();
    }

    function clear() {
      onChangeText("");
    }

    function onFocus(e: Parameters<NonNullable<typeof onFocusProp>>[0]) {
      setShowCancel(true);
      onFocusProp?.(e);
    }

    return (
      <Animated.View style={[styles.root, rootStyle]}>
        <Animated.View
          style={[
            BORDER_CURVE,
            styles.fieldWrap,
            { backgroundColor: colors.card },
            containerStyle,
          ]}
        >
          <View style={[styles.iconWrap, iconContainerStyle]}>
            <SearchIcon color={colors.muted} size={20} />
          </View>
          <TextInput
            ref={inputRef}
            placeholder={placeholder}
            style={[
              styles.input,
              { color: colors.foreground },
              !showCancel && { backgroundColor: undefined },
              inputStyle,
            ]}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            clearButtonMode="while-editing"
            role="searchbox"
            {...props}
          />
        </Animated.View>
        <Animated.View
          ref={animatedRef}
          style={buttonStyle3}
          pointerEvents={!showCancel ? "none" : "auto"}
        >
          <Pressable
            onPress={() => {
              onChangeText("");
              inputRef.current?.blur();
              setShowCancel(false);
              onCancel?.();
            }}
            disabled={!showCancel}
            pointerEvents={!showCancel ? "none" : "auto"}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.5 },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.primary }]}>
              {cancelText}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldWrap: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 8,
  },
  iconWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    top: 0,
    zIndex: 50,
    justifyContent: "center",
    paddingLeft: 6,
  },
  input: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingLeft: 32,
    paddingRight: 4,
    fontSize: 17,
  },
  cancelBtn: {
    flex: 1,
    justifyContent: "center",
  },
  cancelText: {
    paddingHorizontal: 8,
  },
});

SearchInput.displayName = "SearchInput";

export { SearchInput };
