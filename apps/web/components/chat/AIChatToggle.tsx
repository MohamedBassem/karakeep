"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AIChatPanel } from "./AIChatPanel";

export function AIChatToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AIChatPanel open={open} onClose={() => setOpen(false)} />
      {!open && (
        <Button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </>
  );
}
