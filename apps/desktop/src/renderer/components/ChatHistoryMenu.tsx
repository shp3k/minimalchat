import { MoreVertical, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Translation } from "@/lib/i18n";

interface ChatHistoryMenuProps {
  savedMessages: boolean;
  busy: boolean;
  t: Translation;
  onClear: (mode: "me" | "all") => Promise<boolean>;
}

export function ChatHistoryMenu({ savedMessages, busy, t, onClear }: ChatHistoryMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !confirmOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirmOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setConfirmOpen(false);
    };

    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape, true);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [confirmOpen, open]);

  async function clear(mode: "me" | "all") {
    const cleared = await onClear(mode);
    if (!cleared) return;

    setOpen(false);
    setConfirmOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t.chat.chatMenu}
        title={t.chat.chatMenu}
        className="grid h-10 w-10 place-items-center rounded-xl text-secondaryText transition hover:bg-white/[0.06] hover:text-primaryText"
        onClick={() => {
          setOpen((current) => !current);
          setConfirmOpen(false);
        }}
      >
        <MoreVertical size={19} />
      </button>

      <AnimatePresence>
        {open && !confirmOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-borderSoft bg-panel/95 p-1 shadow-glow backdrop-blur"
          >
            <button
              type="button"
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-red-200 transition hover:bg-red-500/20 hover:text-red-100"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 size={16} />
              {t.chat.clearHistory}
            </button>
          </motion.div>
        ) : null}

        {confirmOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-borderSoft bg-panel/95 p-2 text-primaryText shadow-glow backdrop-blur"
          >
            <div className="px-2 pb-2 pt-1">
              <p className="text-sm font-semibold">{t.chat.clearHistoryQuestion}</p>
              <p className="mt-1 text-xs leading-5 text-secondaryText">{t.chat.clearHistoryHelp}</p>
            </div>
            {savedMessages ? (
              <MenuButton danger disabled={busy} icon={<Trash2 size={16} />} label={t.chat.clearHistory} onClick={() => clear("all")} />
            ) : (
              <>
                <MenuButton disabled={busy} icon={<Trash2 size={16} />} label={t.chat.deleteForMe} onClick={() => clear("me")} />
                <MenuButton danger disabled={busy} icon={<Trash2 size={16} />} label={t.chat.deleteForEveryone} onClick={() => clear("all")} />
              </>
            )}
            <MenuButton icon={<X size={16} />} label={t.chat.cancelEdit} onClick={() => setConfirmOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  danger,
  disabled,
  onClick
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={
        "flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 " +
        (danger
          ? "text-red-200 hover:bg-red-500/20 hover:text-red-100"
          : "text-primaryText hover:bg-white/[0.07]")
      }
      onClick={() => void onClick()}
    >
      {icon}
      {label}
    </button>
  );
}
