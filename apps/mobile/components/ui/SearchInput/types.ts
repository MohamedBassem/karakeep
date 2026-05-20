import type {
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from "react-native";

interface SearchInputProps extends Omit<TextInputProps, "style"> {
  containerStyle?: StyleProp<ViewStyle>;
  iconContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  cancelText?: string;
  iconColor?: string;
  onCancel?: () => void;
}

type SearchInputRef = TextInput;

export type { SearchInputProps, SearchInputRef };
