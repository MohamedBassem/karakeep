import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const bubbleVariants = cva(
  "relative flex w-fit min-w-0 max-w-[80%] flex-col gap-1 data-[variant=ghost]:max-w-full group-data-[align=end]/message:self-end",
  {
    variants: {
      variant: {
        default:
          "[&>[data-slot=bubble-content]]:bg-primary [&>[data-slot=bubble-content]]:text-primary-foreground",
        secondary:
          "[&>[data-slot=bubble-content]]:bg-secondary [&>[data-slot=bubble-content]]:text-secondary-foreground",
        muted: "[&>[data-slot=bubble-content]]:bg-muted",
        tinted: "[&>[data-slot=bubble-content]]:bg-primary/10",
        outline:
          "[&>[data-slot=bubble-content]]:border-border [&>[data-slot=bubble-content]]:bg-background",
        ghost:
          "border-none [&>[data-slot=bubble-content]]:max-w-full [&>[data-slot=bubble-content]]:rounded-none [&>[data-slot=bubble-content]]:bg-transparent [&>[data-slot=bubble-content]]:p-0",
        destructive:
          "[&>[data-slot=bubble-content]]:bg-destructive/10 [&>[data-slot=bubble-content]]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleContent({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        "w-fit min-w-0 max-w-full overflow-hidden break-words rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Bubble, BubbleContent, bubbleVariants };
