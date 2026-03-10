"use client";

import type { UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatToolInvocation } from "./ChatToolInvocation";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-4 flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className="mt-1 shrink-0">
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <ReactMarkdown
                key={i}
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm max-w-none break-words dark:prose-invert"
              >
                {part.text}
              </ReactMarkdown>
            );
          }
          if (part.type === "tool-invocation") {
            return (
              <ChatToolInvocation key={i} invocation={part.toolInvocation} />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
