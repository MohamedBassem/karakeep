import { memo } from "react";
import type { ComponentProps } from "react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

const streamdownPlugins = { cjk, code, math, mermaid };

export const ChatMarkdown = memo(
  ({ className, ...props }: ComponentProps<typeof Streamdown>) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
);

ChatMarkdown.displayName = "ChatMarkdown";
