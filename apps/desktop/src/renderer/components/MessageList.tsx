import { useEffect, useRef, useState } from "react";
import type { MessageDTO } from "@minimalchat/shared";
import { Pin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MessageBubble } from "@/components/MessageBubble";
import type { Translation } from "@/lib/i18n";

interface MessageListProps {
  currentUserId: string;
  currentUserName: string;
  otherUserName: string;
  messages: MessageDTO[];
  loading: boolean;
  t: Translation;
  pinnedMessage: MessageDTO | null;
  onEditMessage: (message: MessageDTO, text: string) => Promise<void>;
  onDeleteMessage: (message: MessageDTO, mode: "me" | "all") => Promise<void>;
  onPinMessage: (message: MessageDTO) => Promise<void>;
  onToggleReaction: (message: MessageDTO, emoji: string) => Promise<void>;
  onReplyMessage: (message: MessageDTO) => void;
  onPinnedConsumed: () => void;
  onOpenImage: (image: { url: string; name: string }) => void;
}

export function MessageList({
  currentUserId,
  currentUserName,
  otherUserName,
  messages,
  loading,
  t,
  pinnedMessage,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onToggleReaction,
  onReplyMessage,
  onPinnedConsumed,
  onOpenImage
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
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
    const estimatedPopupHeight = type === "delete" ? 176 : type === "reactions" ? 58 : 230;
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
      {pinnedMessage ? (
        <button
          type="button"
          className="mx-7 mt-4 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-left text-sm text-primaryText transition hover:bg-accent/14"
          onClick={() => {
            scrollToMessage(pinnedMessage.id);
            onPinnedConsumed();
          }}
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/18 text-accent">
            <Pin size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-secondaryText">{t.chat.pinned}</p>
            <p className="mt-0.5 truncate text-sm">
              {pinnedMessage.text || pinnedMessage.attachmentName || t.chat.originalMessage}
            </p>
          </div>
        </button>
      ) : null}
      <div ref={scrollAreaRef} className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
      {messages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid h-full place-items-center text-center text-sm leading-6 text-secondaryText"
        >
          {t.chat.startConversation}
        </motion.div>
      ) : (
        <div className="flex min-h-full flex-col justify-end gap-2.5">
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const replyToMessage = message.replyToMessageId
                ? messages.find((item) => item.id === message.replyToMessageId) ?? null
                : null;

              return (
              <div
                key={message.id}
                ref={(element) => {
                  if (element) {
                    messageRefs.current.set(message.id, element);
                  } else {
                    messageRefs.current.delete(message.id);
                  }
                }}
              >
                <MessageBubble
                  message={message}
                  currentUserId={currentUserId}
                  mine={message.senderId === currentUserId}
                  highlighted={highlightedId === message.id}
                  popupType={activePopup?.messageId === message.id ? activePopup.type : null}
                  popupPlacement={activePopup?.messageId === message.id ? activePopup.placement : "top"}
                  t={t}
                  replyToMessage={replyToMessage}
                  replyToAuthorName={replyToMessage ? getMessageAuthorName(replyToMessage, currentUserId, currentUserName, otherUserName) : ""}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onPin={onPinMessage}
                  onToggleReaction={onToggleReaction}
                  onReply={onReplyMessage}
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
          </AnimatePresence>
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
