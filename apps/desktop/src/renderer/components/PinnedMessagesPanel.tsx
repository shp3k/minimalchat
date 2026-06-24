import type { MessageDTO } from "@minimalchat/shared";
import { ChevronDown, ChevronUp, List, Pin, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Translation } from "@/lib/i18n";
import { formatMessageTime } from "@/lib/utils";

interface PinnedMessagesPanelProps {
  messages: MessageDTO[];
  activeIndex: number;
  t: Translation;
  onActiveIndexChange: (index: number) => void;
  onOpenMessage: (messageId: string) => void;
}

export function PinnedMessagesPanel({
  messages,
  activeIndex,
  t,
  onActiveIndexChange,
  onOpenMessage
}: PinnedMessagesPanelProps) {
  const [listOpen, setListOpen] = useState(false);
  const activeMessage = messages[activeIndex] ?? messages[0];

  useEffect(() => {
    if (!listOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setListOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [listOpen]);

  if (!activeMessage) return null;

  function move(offset: number) {
    onActiveIndexChange((activeIndex + offset + messages.length) % messages.length);
  }

  return (
    <>
      <div className="mx-7 mt-4 flex h-14 shrink-0 items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.08] px-3 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onOpenMessage(activeMessage.id)}
        >
          <span className="h-9 w-1 shrink-0 rounded-full bg-accent" />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/16 text-accent">
            <Pin size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              {t.chat.pinnedMessages} · {activeIndex + 1}/{messages.length}
            </span>
            <span className="mt-0.5 block truncate text-sm text-primaryText">{preview(activeMessage, t)}</span>
          </span>
        </button>
        {messages.length > 1 ? (
          <div className="flex items-center">
            <IconButton label={t.chat.previousPinned} onClick={() => move(-1)}>
              <ChevronUp size={16} />
            </IconButton>
            <IconButton label={t.chat.nextPinned} onClick={() => move(1)}>
              <ChevronDown size={16} />
            </IconButton>
          </div>
        ) : null}
        <IconButton label={t.chat.showAllPinned} onClick={() => setListOpen(true)}>
          <List size={17} />
        </IconButton>
      </div>

      <AnimatePresence>
        {listOpen ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-6 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="flex max-h-[min(620px,calc(100%-32px))] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-borderSoft bg-panel shadow-glow"
            >
              <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <Pin size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-primaryText">{t.chat.pinnedMessages}</h2>
                    <p className="mt-0.5 text-xs text-secondaryText">{messages.length}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={t.profile.close} onClick={() => setListOpen(false)}>
                  <X size={18} />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="space-y-1.5">
                  {messages.map((message, index) => (
                    <button
                      key={message.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-borderSoft hover:bg-white/[0.05]"
                      onClick={() => {
                        onActiveIndexChange(index);
                        onOpenMessage(message.id);
                        setListOpen(false);
                      }}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
                        <Pin size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-primaryText">{preview(message, t)}</span>
                        <span className="mt-1 block text-xs text-secondaryText">{formatMessageTime(message.sentAt)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="grid h-9 w-8 place-items-center rounded-lg text-secondaryText transition hover:bg-white/[0.07] hover:text-primaryText"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function preview(message: MessageDTO, t: Translation) {
  return message.text.trim() || message.attachmentName || t.chat.originalMessage;
}
