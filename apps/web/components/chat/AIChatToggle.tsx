"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AIChatPanel } from "./AIChatPanel";

export function AIChatToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={() => setOpen((o) => !o)}
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
      <AIChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
