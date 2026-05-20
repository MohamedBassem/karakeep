import Markdown from "react-native-markdown-display";
import { useColorScheme } from "@/lib/useColorScheme";

export default function BookmarkTextMarkdown({ text }: { text: string }) {
  const { colors } = useColorScheme();
  return (
    <Markdown
      style={{
        text: {
          color: colors.foreground,
        },
      }}
    >
      {text}
    </Markdown>
  );
}
