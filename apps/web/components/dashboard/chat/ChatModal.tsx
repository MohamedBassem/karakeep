"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createTRPCClient,
  httpSubscriptionLink,
  loggerLink,
} from "@trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MessageCircle, Plus, Trash2, X } from "lucide-react";
import superjson from "superjson";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { ButtonWithTooltip } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { cn } from "@/lib/utils";

import { useTRPC } from "@karakeep/shared-react/trpc";
import type { AppRouter } from "@karakeep/trpc/routers/_app";
import type { CacheInvalidationHandle } from "@karakeep/trpc/routers/chat/contracts";

import type { Chat } from "./conversationState";
import { ChatMarkdown } from "./ChatMarkdown";
import {
  getToolStatuses,
  initialStreamState,
  mergeMessages,
  streamReducer,
} from "./conversationState";

type TRPCApi = ReturnType<typeof useTRPC>;

function makeSubscriptionClient() {
  return createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: (op) =>
          process.env.NODE_ENV === "development" ||
          (op.direction === "down" && op.result instanceof Error),
      }),
      httpSubscriptionLink({
        url: "/api/trpc",
        transformer: superjson,
      }),
    ],
  });
}

function formatChatTime(chat: Chat) {
  return (chat.modifiedAt ?? chat.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function invalidateTRPCHandle(
  api: TRPCApi,
  queryClient: ReturnType<typeof useQueryClient>,
  handle: CacheInvalidationHandle,
) {
  switch (handle) {
    case "bookmarks.getBookmark":
      return queryClient.invalidateQueries(
        api.bookmarks.getBookmark.pathFilter(),
      );
    case "bookmarks.getBookmarks":
      return queryClient.invalidateQueries(
        api.bookmarks.getBookmarks.pathFilter(),
      );
    case "bookmarks.searchBookmarks":
      return queryClient.invalidateQueries(
        api.bookmarks.searchBookmarks.pathFilter(),
      );
    case "highlights.get":
      return queryClient.invalidateQueries(api.highlights.get.pathFilter());
    case "highlights.getAll":
      return queryClient.invalidateQueries(api.highlights.getAll.pathFilter());
    case "highlights.getForBookmark":
      return queryClient.invalidateQueries(
        api.highlights.getForBookmark.pathFilter(),
      );
    case "highlights.search":
      return queryClient.invalidateQueries(api.highlights.search.pathFilter());
    case "lists.get":
      return queryClient.invalidateQueries(api.lists.get.pathFilter());
    case "lists.getListsOfBookmark":
      return queryClient.invalidateQueries(
        api.lists.getListsOfBookmark.pathFilter(),
      );
    case "lists.list":
      return queryClient.invalidateQueries(api.lists.list.pathFilter());
    case "lists.stats":
      return queryClient.invalidateQueries(api.lists.stats.pathFilter());
    case "tags.get":
      return queryClient.invalidateQueries(api.tags.get.pathFilter());
    case "tags.list":
      return queryClient.invalidateQueries(api.tags.list.pathFilter());
    default: {
      // Exhaustiveness guard: a new CacheInvalidationHandle added on the server
      // (contracts.ts) won't compile here until it is mapped to a query.
      const unhandled: never = handle;
      return unhandled;
    }
  }
}

function useChat(open: boolean) {
  const api = useTRPC();
  const queryClient = useQueryClient();
  const subscriptionClient = useMemo(makeSubscriptionClient, []);
  const clearChatMutation = useMutation(api.chat.clear.mutationOptions());
  const [stream, dispatch] = useReducer(streamReducer, initialStreamState);
  const [selection, setSelection] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const unsubRef = useRef<null | (() => void)>(null);

  const chatsQuery = useQuery(
    api.chat.list.queryOptions(undefined, { enabled: open, staleTime: 0 }),
  );
  const chats = chatsQuery.data ?? [];
  const activeChatId =
    selection === "new"
      ? null
      : (chats.find((chat) => chat.id === selection)?.id ??
        chats[0]?.id ??
        null);
  const historyQuery = useQuery(
    api.chat.history.queryOptions(
      { chatId: activeChatId ?? "" },
      { enabled: open && activeChatId !== null, staleTime: 0 },
    ),
  );

  const stop = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setRunning(false);
    dispatch({ type: "streamEnded" });
    void queryClient.invalidateQueries(api.chat.history.pathFilter());
    void queryClient.invalidateQueries(api.chat.list.pathFilter());
  }, [api, queryClient]);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  const send = useCallback(
    (messageText = draft) => {
      if (running || !messageText.trim()) {
        return;
      }

      const nextMessage = messageText.trim();
      setDraft("");
      setStreamError(null);
      setRunning(true);
      dispatch({ type: "streamStarted", chatId: activeChatId });

      const sub = subscriptionClient.chat.message.subscribe(
        {
          chatId: activeChatId ?? undefined,
          message: nextMessage,
        },
        {
          onData: (event) => {
            dispatch({ type: "streamEvent", event });
            if (event.type === "chat") {
              setSelection(event.chat.id);
              queryClient.setQueryData(api.chat.list.queryKey(), (current) => {
                if (!current) {
                  return current;
                }
                return [
                  event.chat,
                  ...current.filter((chat) => chat.id !== event.chat.id),
                ];
              });
            }
            // The reducer owns conversation state; cache invalidation is a side
            // effect against the query client, so it stays in the component.
            if (event.type === "cache_invalidation") {
              void Promise.all(
                event.trpcHandles.map((handle) =>
                  invalidateTRPCHandle(api, queryClient, handle),
                ),
              );
            }
          },
          onError: (err) => {
            setStreamError(err.message);
            setRunning(false);
            dispatch({ type: "streamEnded" });
            // Restore the message that failed to send so the user can retry it,
            // unless they've already started typing something new.
            setDraft((current) => (current.trim() ? current : nextMessage));
          },
          onComplete: () => {
            setRunning(false);
            dispatch({ type: "streamEnded" });
            void queryClient.invalidateQueries(api.chat.history.pathFilter());
            void queryClient.invalidateQueries(api.chat.list.pathFilter());
          },
        },
      );

      unsubRef.current = () => sub.unsubscribe();
    },
    [activeChatId, api, draft, queryClient, running, subscriptionClient],
  );

  const selectChat = useCallback(
    (chatId: string) => {
      if (running || chatId === activeChatId) {
        return;
      }

      stop();
      setSelection(chatId);
      setStreamError(null);
    },
    [activeChatId, running, stop],
  );

  const newChat = useCallback(() => {
    if (running) {
      return;
    }

    stop();
    setSelection("new");
    dispatch({ type: "streamStarted", chatId: null });
    setStreamError(null);
    setDraft("");
  }, [running, stop]);

  const deleteChat = useCallback(async () => {
    if (running || !activeChatId || clearChatMutation.isPending) {
      return;
    }

    stop();
    try {
      await clearChatMutation.mutateAsync({ chatId: activeChatId });
      setSelection(null);
      await queryClient.invalidateQueries(api.chat.list.pathFilter());
      setStreamError(null);
      setDraft("");
    } catch (err) {
      setStreamError(
        err instanceof Error ? err.message : "Failed to delete chat",
      );
    }
  }, [activeChatId, api, clearChatMutation, queryClient, running, stop]);

  const messages = mergeMessages(historyQuery.data ?? [], stream, activeChatId);

  const displayedMessages = useMemo(() => {
    const visibleMessages = messages.filter(
      (message) => message.role !== "toolResult",
    );
    return stream.streamingMessage
      ? [...visibleMessages, stream.streamingMessage]
      : visibleMessages;
  }, [messages, stream.streamingMessage]);

  const resolvedToolStatuses = useMemo(
    () => getToolStatuses(messages, stream.toolStatuses),
    [messages, stream.toolStatuses],
  );

  const queryError = chatsQuery.error ?? historyQuery.error;
  const error =
    streamError ??
    (queryError instanceof Error
      ? queryError.message
      : queryError?.toString()) ??
    null;

  return {
    activeChatId,
    chats,
    deleteChat,
    displayedMessages,
    draft,
    error,
    loading: chatsQuery.isPending && open,
    newChat,
    resolvedToolStatuses,
    running,
    selectChat,
    send,
    setDraft,
    stop,
  };
}

export default function ChatModal() {
  const [open, setOpen] = useState(false);
  const chat = useChat(open);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          chat.stop();
        }
      }}
    >
      <DialogTrigger asChild>
        <ButtonWithTooltip
          variant="ghost"
          tooltip="Chat"
          delayDuration={100}
          aria-label="Chat"
        >
          <MessageCircle size={18} />
        </ButtonWithTooltip>
      </DialogTrigger>
      <DialogContent
        className="flex h-[min(760px,calc(100dvh-32px))] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:rounded-md"
        hideCloseBtn
      >
        <DialogHeader className="border-b px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex min-h-6 items-center gap-2 text-base leading-none">
                <MessageCircle className="size-4 shrink-0" />
                Chat
                <Badge
                  variant="outline"
                  className="h-5 rounded-sm border-yellow-300 bg-yellow-100 px-1.5 text-[10px] font-medium uppercase tracking-normal text-yellow-800 dark:border-yellow-700/70 dark:bg-yellow-900/30 dark:text-yellow-200"
                >
                  Experimental
                </Badge>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Ask questions about your saved bookmarks.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              <ButtonWithTooltip
                type="button"
                variant="ghost"
                size="icon"
                tooltip="New chat"
                disabled={chat.running}
                onClick={chat.newChat}
                aria-label="New chat"
              >
                <Plus className="size-4" />
              </ButtonWithTooltip>
              <ButtonWithTooltip
                type="button"
                variant="ghost"
                size="icon"
                tooltip="Delete chat"
                disabled={chat.running || !chat.activeChatId}
                onClick={() => void chat.deleteChat()}
                aria-label="Delete chat"
              >
                <Trash2 className="size-4" />
              </ButtonWithTooltip>
              <ButtonWithTooltip
                type="button"
                variant="ghost"
                size="icon"
                tooltip="Close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </ButtonWithTooltip>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[220px_1fr] md:grid-rows-1">
          <aside className="min-w-0 border-b bg-muted/35 md:border-b-0 md:border-r">
            <div className="flex gap-1 overflow-x-auto p-2 md:h-full md:flex-col md:overflow-y-auto">
              {chat.loading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading
                </div>
              ) : chat.chats.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No chats
                </div>
              ) : (
                chat.chats.map((chatSession) => (
                  <button
                    type="button"
                    key={chatSession.id}
                    onClick={() => void chat.selectChat(chatSession.id)}
                    disabled={chat.running}
                    className={cn(
                      "min-w-44 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 md:min-w-0",
                      chatSession.id === chat.activeChatId
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/70",
                    )}
                  >
                    <div className="truncate font-medium leading-5">
                      {chatSession.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatChatTime(chatSession)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-background">
            <MessageScrollerProvider
              key={chat.activeChatId ?? "new-chat"}
              autoScroll
              defaultScrollPosition="last-anchor"
            >
              <MessageScroller className="min-h-0 flex-1">
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={chat.running}
                    className={cn(
                      "mx-auto w-full max-w-3xl gap-4 px-4 py-5",
                      chat.displayedMessages.length === 0 &&
                        "h-full items-center justify-center",
                    )}
                  >
                    {chat.displayedMessages.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <div className="rounded-full border bg-muted/50 p-3">
                          <MessageCircle className="size-5" />
                        </div>
                        <div className="font-medium text-foreground">
                          Start a chat
                        </div>
                        <div className="text-sm">
                          Ask about saved links, notes, and summaries.
                        </div>
                      </div>
                    ) : (
                      chat.displayedMessages.map((message) => {
                        const toolCallsToShow = (
                          message.toolCalls ?? []
                        ).filter((toolCall) =>
                          chat.resolvedToolStatuses.has(toolCall.id),
                        );

                        if (!message.content && toolCallsToShow.length === 0) {
                          // Only the live streaming placeholder should spin. A
                          // persisted message with no content and no resolvable tool
                          // calls (e.g. a turn aborted before its tools finished)
                          // would otherwise render a permanent spinner.
                          if (message.id !== "streaming-assistant") {
                            return null;
                          }
                          return (
                            <MessageScrollerItem
                              key={message.id}
                              messageId={message.id}
                            >
                              <Marker role="status">
                                <MarkerIcon>
                                  <Loader2 className="animate-spin" />
                                </MarkerIcon>
                                <MarkerContent>Thinking...</MarkerContent>
                              </Marker>
                            </MessageScrollerItem>
                          );
                        }

                        return (
                          <MessageScrollerItem
                            key={message.id}
                            messageId={message.id}
                            scrollAnchor={message.role === "user"}
                          >
                            <Message
                              align={message.role === "user" ? "end" : "start"}
                            >
                              <MessageContent>
                                <Bubble
                                  variant={
                                    message.role === "user"
                                      ? "default"
                                      : "ghost"
                                  }
                                >
                                  <BubbleContent>
                                    {message.content &&
                                      message.role === "assistant" && (
                                        <ChatMarkdown>
                                          {message.content}
                                        </ChatMarkdown>
                                      )}
                                    {message.content &&
                                      message.role !== "assistant" && (
                                        <div className="whitespace-pre-wrap break-words">
                                          {message.content}
                                        </div>
                                      )}
                                  </BubbleContent>
                                </Bubble>
                                {toolCallsToShow.map((toolCall) => {
                                  const toolStatus =
                                    chat.resolvedToolStatuses.get(toolCall.id);
                                  return (
                                    <Marker
                                      key={toolCall.id}
                                      role={
                                        toolStatus?.status === "running"
                                          ? "status"
                                          : undefined
                                      }
                                      title={toolStatus?.error}
                                    >
                                      <MarkerIcon>
                                        {toolStatus?.status === "running" ? (
                                          <Loader2 className="animate-spin" />
                                        ) : (
                                          <Check
                                            className={cn(
                                              toolStatus?.status === "error"
                                                ? "text-destructive"
                                                : "text-emerald-600",
                                            )}
                                          />
                                        )}
                                      </MarkerIcon>
                                      <MarkerContent>
                                        {toolCall.name}
                                      </MarkerContent>
                                    </Marker>
                                  );
                                })}
                              </MessageContent>
                            </Message>
                          </MessageScrollerItem>
                        );
                      })
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>

            {chat.error && (
              <div className="border-t px-4 py-2 text-sm text-destructive">
                {chat.error}
              </div>
            )}

            <div className="border-t bg-background p-3">
              <PromptInput
                className="mx-auto max-w-3xl"
                onSubmit={(message) => chat.send(message.text)}
              >
                <PromptInputTextarea
                  value={chat.draft}
                  onChange={(event) => chat.setDraft(event.target.value)}
                  disabled={chat.running}
                  placeholder="Ask about your bookmarks..."
                  className="min-h-11"
                />
                <PromptInputFooter>
                  <div />
                  <PromptInputSubmit
                    status={chat.running ? "streaming" : "ready"}
                    onStop={chat.stop}
                    disabled={!chat.running && !chat.draft.trim()}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
