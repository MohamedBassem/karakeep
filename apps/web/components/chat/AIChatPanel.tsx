"use client";

import { useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Loader2, Plus, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ChatMessage } from "./ChatMessage";
import { useChatCacheInvalidation } from "./useChatCacheInvalidation";

export function AIChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const onFinish = useChatCacheInvalidation();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    setInput,
  } = useChat({ api: "/api/chat", onFinish });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  return (
    <div className="fixed right-4 top-16 z-50 flex h-[min(600px,calc(100vh-5rem))] w-[420px] flex-col rounded-lg border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">AI Assistant</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setMessages([]);
              setInput("");
            }}
            disabled={isLoading || messages.length === 0}
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Ask me to find bookmarks, organize tags, manage lists, or save new
            links.
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive">Error: {error.message}</div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={input}
            onChange={handleInputChange}
            placeholder="Search bookmarks, manage tags..."
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
