import { Bookmark, Copy, Forward, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MessageSelectionBarProps {
  count: number;
  savedMessages: boolean;
  canCopy: boolean;
  busy: boolean;
  t: Translation;
  onCopy: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onForward: () => void;
  onDelete: (mode: "me" | "all") => void | Promise<void>;
  onCancel: () => void;
}

export function MessageSelectionBar({
  count,
  savedMessages,
  canCopy,
  busy,
  t,
  onCopy,
  onSave,
  onForward,
  onDelete,
  onCancel
}: MessageSelectionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="relative shrink-0 border-t border-borderSoft bg-panel/75 px-5 py-4 backdrop-blur">
      <AnimatePresence>
        {deleteOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className="absolute bottom-[calc(100%-4px)] right-5 z-30 w-60 rounded-2xl border border-borderSoft bg-panel/95 p-2 text-primaryText shadow-glow backdrop-blur"
          >
            <p className="px-2 pb-2 pt-1 text-sm font-semibold">{t.chat.deleteSelectedQuestion}</p>
            {savedMessages ? (
              <DeleteButton
                label={t.chat.deleteMessage}
                onClick={async () => {
                  await onDelete("all");
                  setDeleteOpen(false);
                }}
              />
            ) : (
              <>
                <ActionButton
                  label={t.chat.deleteForMe}
                  icon={<Trash2 size={16} />}
                  onClick={async () => {
                    await onDelete("me");
                    setDeleteOpen(false);
                  }}
                />
                <DeleteButton
                  label={t.chat.deleteForEveryone}
                  onClick={async () => {
                    await onDelete("all");
                    setDeleteOpen(false);
                  }}
                />
              </>
            )}
            <ActionButton label={t.chat.cancelEdit} icon={<X size={16} />} onClick={() => setDeleteOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-12 items-center gap-2 rounded-2xl border border-borderSoft bg-background/70 px-2 shadow-[0_12px_35px_rgba(0,0,0,0.24)]"
      >
        <button
          type="button"
          title={t.chat.clearSelection}
          aria-label={t.chat.clearSelection}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-secondaryText transition hover:bg-white/[0.07] hover:text-primaryText"
          onClick={onCancel}
        >
          <X size={18} />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primaryText">
          {t.chat.selectedMessages}: {count}
        </span>
        <ToolbarButton
          icon={<Copy size={18} />}
          label={t.chat.copyMessage}
          disabled={!canCopy || busy}
          onClick={onCopy}
        />
        {!savedMessages ? (
          <ToolbarButton
            icon={<Bookmark size={18} />}
            label={t.chat.saveToSavedMessages}
            disabled={busy}
            onClick={onSave}
          />
        ) : null}
        <ToolbarButton icon={<Forward size={18} />} label={t.chat.forwardMessage} disabled={busy} onClick={onForward} />
        <ToolbarButton
          icon={<Trash2 size={18} />}
          label={t.chat.deleteMessage}
          danger
          disabled={busy}
          onClick={() => setDeleteOpen((current) => !current)}
        />
      </motion.div>
    </div>
  );
}

function ToolbarButton({
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
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-35",
        danger
          ? "text-red-300 hover:bg-red-500/15 hover:text-red-200"
          : "text-secondaryText hover:bg-white/[0.07] hover:text-primaryText"
      )}
      onClick={() => void onClick()}
    >
      {icon}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-primaryText transition hover:bg-white/[0.07]"
      onClick={() => void onClick()}
    >
      {icon}
      {label}
    </button>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void | Promise<void> }) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-red-200 transition hover:bg-red-500/20 hover:text-red-100"
      onClick={() => void onClick()}
    >
      <Trash2 size={16} />
      {label}
    </button>
  );
}
