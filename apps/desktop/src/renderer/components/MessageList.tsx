import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { MessageDTO } from "@minimalchat/shared";
import { motion } from "motion/react";
import { MessageBubble } from "@/components/MessageBubble";
import { PinnedMessagesPanel } from "@/components/PinnedMessagesPanel";
import type { Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MessageListProps {
  currentUserId: string;
  currentUserName: string;
  otherUserName: string;
  messages: MessageDTO[];
  loading: boolean;
  emptyText?: string;
  savedMessages?: boolean;
  selectedMessageIds: string[];
  searchQuery?: string;
  activeSearchMessageId?: string | null;
  t: Translation;
  pinnedMessages: MessageDTO[];
  pinnedIndex: number;
  onEditMessage: (message: MessageDTO, text: string) => Promise<void>;
  onDeleteMessage: (message: MessageDTO, mode: "me" | "all") => Promise<void>;
  onPinMessage: (message: MessageDTO) => Promise<void>;
  onToggleReaction: (message: MessageDTO, emoji: string) => Promise<void>;
  onForwardMessage: (message: MessageDTO) => void;
  onReplyMessage: (message: MessageDTO) => void;
  onSelectionChange: (messageIds: string[]) => void;
  onPinnedIndexChange: (index: number) => void;
  onOpenImage: (image: { url: string; name: string }) => void;
}

export function MessageList({
  currentUserId,
  currentUserName,
  otherUserName,
  messages,
  loading,
  emptyText,
  savedMessages = false,
  selectedMessageIds,
  searchQuery = "",
  activeSearchMessageId = null,
  t,
  pinnedMessages,
  pinnedIndex,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onToggleReaction,
  onForwardMessage,
  onReplyMessage,
  onSelectionChange,
  onPinnedIndexChange,
  onOpenImage
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const selectionAnchorRef = useRef<string | null>(null);
  const dragSelectionRef = useRef<{
    startId: string;
    startY: number;
    active: boolean;
    baseIds: string[];
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<{
    messageId: string;
    type: "menu" | "delete" | "reactions";
    placement: "top" | "bottom";
  } | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (activePopup && !messages.some((message) => message.id === activePopup.messageId)) {
      setActivePopup(null);
    }
  }, [activePopup, messages]);

  useEffect(() => {
    if (!activeSearchMessageId) return;

    const element = messageRefs.current.get(activeSearchMessageId);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSearchMessageId]);

  useEffect(() => {
    const availableIds = new Set(messages.map((message) => message.id));
    const nextIds = selectedMessageIds.filter((id) => availableIds.has(id));

    if (nextIds.length !== selectedMessageIds.length) {
      onSelectionChange(nextIds);
    }
  }, [messages, onSelectionChange, selectedMessageIds]);

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      const drag = dragSelectionRef.current;
      if (!drag) return;

      if (!drag.active && Math.abs(event.clientY - drag.startY) >= 5) {
        drag.active = true;
        suppressClickRef.current = true;
        setActivePopup(null);
        window.getSelection()?.removeAllRanges();
        selectDragRange(drag.startId);
      }

      if (!drag.active) return;

      event.preventDefault();
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;

      const bounds = scrollArea.getBoundingClientRect();
      if (event.clientY < bounds.top + 36) {
        scrollArea.scrollBy({ top: -14 });
      } else if (event.clientY > bounds.bottom - 36) {
        scrollArea.scrollBy({ top: 14 });
      }
    }

    function handleMouseUp() {
      const wasActive = Boolean(dragSelectionRef.current?.active);
      dragSelectionRef.current = null;

      if (wasActive) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [messages, onSelectionChange]);

  function selectDragRange(endId: string) {
    const drag = dragSelectionRef.current;
    if (!drag) return;

    const startIndex = messages.findIndex((message) => message.id === drag.startId);
    const endIndex = messages.findIndex((message) => message.id === endId);
    if (startIndex === -1 || endIndex === -1) return;

    const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const rangeIds = messages.slice(start, end + 1).map((message) => message.id);
    onSelectionChange(Array.from(new Set([...drag.baseIds, ...rangeIds])));
  }

  function startDragSelection(messageId: string, event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;

    dragSelectionRef.current = {
      startId: messageId,
      startY: event.clientY,
      active: false,
      baseIds: event.ctrlKey || event.metaKey ? selectedMessageIds : []
    };
    selectionAnchorRef.current = messageId;
    event.preventDefault();
  }

  function continueDragSelection(messageId: string) {
    if (!dragSelectionRef.current?.active) return;
    selectDragRange(messageId);
  }

  function selectMessage(messageId: string, event?: MouseEvent<HTMLDivElement>) {
    const current = new Set(selectedMessageIds);

    if (event?.shiftKey && selectionAnchorRef.current) {
      const anchorIndex = messages.findIndex((message) => message.id === selectionAnchorRef.current);
      const currentIndex = messages.findIndex((message) => message.id === messageId);

      if (anchorIndex !== -1 && currentIndex !== -1) {
        const [start, end] = anchorIndex < currentIndex ? [anchorIndex, currentIndex] : [currentIndex, anchorIndex];
        const range = messages.slice(start, end + 1).map((message) => message.id);
        onSelectionChange(event.ctrlKey || event.metaKey ? Array.from(new Set([...selectedMessageIds, ...range])) : range);
        return;
      }
    }

    if (current.has(messageId)) {
      current.delete(messageId);
    } else {
      current.add(messageId);
    }

    selectionAnchorRef.current = messageId;
    onSelectionChange(Array.from(current));
  }

  function handleMessageClick(messageId: string, event: MouseEvent<HTMLDivElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }

    const selectionMode = selectedMessageIds.length > 0;
    if (!selectionMode && !event.ctrlKey && !event.metaKey && !event.shiftKey) return;

    event.preventDefault();
    selectMessage(messageId, event);
  }

  function scrollToMessage(messageId: string) {
    const element = messageRefs.current.get(messageId);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(messageId);
    window.setTimeout(() => setHighlightedId((current) => (current === messageId ? null : current)), 2600);
  }

  function openPopup(messageId: string, type: "menu" | "delete" | "reactions") {
    const messageElement = messageRefs.current.get(messageId);
    const scrollArea = scrollAreaRef.current;
    const estimatedPopupHeight = type === "delete" ? 176 : type === "reactions" ? 58 : 310;
    const placement =
      messageElement && scrollArea
        ? scrollArea.getBoundingClientRect().bottom - messageElement.getBoundingClientRect().bottom < estimatedPopupHeight + 12
          ? "top"
          : "bottom"
        : "bottom";

    setActivePopup({ messageId, type, placement });
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-7 py-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={index % 2 ? "flex justify-end" : "flex justify-start"}>
            <div className="h-16 w-[42%] animate-pulse rounded-[22px] bg-white/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PinnedMessagesPanel
        messages={pinnedMessages}
        activeIndex={pinnedIndex}
        t={t}
        onActiveIndexChange={onPinnedIndexChange}
        onOpenMessage={scrollToMessage}
      />
      <div ref={scrollAreaRef} className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
      {messages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid h-full place-items-center text-center text-sm leading-6 text-secondaryText"
        >
          {emptyText ?? t.chat.startConversation}
        </motion.div>
      ) : (
        <div className="flex min-h-full flex-col justify-end gap-2.5">
          {messages.map((message) => {
            const replyToMessage = message.replyToMessageId
              ? messages.find((item) => item.id === message.replyToMessageId) ?? null
              : null;

            return (
              <div
                key={message.id}
                onMouseDown={(event) => startDragSelection(message.id, event)}
                onMouseEnter={() => continueDragSelection(message.id)}
                onClick={(event) => handleMessageClick(message.id, event)}
                ref={(element) => {
                  if (element) {
                    messageRefs.current.set(message.id, element);
                  } else {
                    messageRefs.current.delete(message.id);
                  }
                }}
                className={cn(
                  "rounded-2xl px-2 py-0.5 transition-colors",
                  selectedMessageIds.includes(message.id) && "bg-accent/10",
                  selectedMessageIds.length > 0 && "cursor-pointer"
                )}
              >
                <MessageBubble
                  message={message}
                  currentUserId={currentUserId}
                  mine={message.senderId === currentUserId}
                  savedMessages={savedMessages}
                  selected={selectedMessageIds.includes(message.id)}
                  searchQuery={searchQuery}
                  highlighted={highlightedId === message.id || activeSearchMessageId === message.id}
                  popupType={activePopup?.messageId === message.id ? activePopup.type : null}
                  popupPlacement={activePopup?.messageId === message.id ? activePopup.placement : "top"}
                  t={t}
                  replyToMessage={replyToMessage}
                  replyToAuthorName={replyToMessage ? getMessageAuthorName(replyToMessage, currentUserId, currentUserName, otherUserName) : ""}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onPin={onPinMessage}
                  onToggleReaction={onToggleReaction}
                  onForward={onForwardMessage}
                  onReply={onReplyMessage}
                  onSelect={(selectedMessage) => selectMessage(selectedMessage.id)}
                  onOpenReply={scrollToMessage}
                  onOpenImage={onOpenImage}
                  onPopupChange={(type) => {
                    if (!type) {
                      setActivePopup(null);
                      return;
                    }

                    openPopup(message.id, type);
                  }}
                />
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
      </div>
    </div>
  );
}

function getMessageAuthorName(message: MessageDTO, currentUserId: string, currentUserName: string, otherUserName: string) {
  return message.senderId === currentUserId ? currentUserName : otherUserName;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, textarea, video, audio, [role='button']"));
}
