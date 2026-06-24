import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MessageDTO } from "@minimalchat/shared";
import {
  Check,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  FileIcon,
  Forward,
  Pause,
  Pencil,
  Pin,
  Play,
  Reply,
  SmilePlus,
  Trash2,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Translation } from "@/lib/i18n";
import { cn, formatMessageTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageDTO;
  currentUserId: string;
  mine: boolean;
  t: Translation;
  highlighted?: boolean;
  popupType: "menu" | "delete" | "reactions" | null;
  popupPlacement: "top" | "bottom";
  replyToMessage: MessageDTO | null;
  replyToAuthorName: string;
  onEdit: (message: MessageDTO, text: string) => Promise<void>;
  onDelete: (message: MessageDTO, mode: "me" | "all") => Promise<void>;
  onPin: (message: MessageDTO) => Promise<void>;
  onToggleReaction: (message: MessageDTO, emoji: string) => Promise<void>;
  onForward: (message: MessageDTO) => void;
  onReply: (message: MessageDTO) => void;
  onOpenReply: (messageId: string) => void;
  onOpenImage: (image: { url: string; name: string }) => void;
  onPopupChange: (type: "menu" | "delete" | "reactions" | null) => void;
}

export function MessageBubble({
  message,
  currentUserId,
  mine,
  t,
  highlighted,
  popupType,
  popupPlacement,
  replyToMessage,
  replyToAuthorName,
  onEdit,
  onDelete,
  onPin,
  onToggleReaction,
  onForward,
  onReply,
  onOpenReply,
  onOpenImage,
  onPopupChange
}: MessageBubbleProps) {
  const attachmentUrl = getAttachmentUrl(message.attachmentUrl);
  const hasAttachment = Boolean(attachmentUrl);
  const copyMode = getCopyMode(message, attachmentUrl);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [busy, setBusy] = useState(false);

  async function saveEdit() {
    const value = draft.trim();
    if (!value || busy) return;

    setBusy(true);
    try {
      await onEdit(message, value);
      setEditing(false);
      onPopupChange(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
      className={cn("relative flex", mine ? "justify-end" : "justify-start")}
    >
      <div className="group relative w-fit max-w-[min(520px,64%)]">
      <div
        onContextMenu={(event) => {
          if (editing) return;
          event.preventDefault();
          onPopupChange(popupType === "menu" ? null : "menu");
        }}
        className={cn(
          "relative max-w-full rounded-2xl border px-3.5 py-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.24)]",
          mine
            ? "rounded-br-md border-accent/25 bg-accent text-white"
            : "rounded-bl-md border-borderSoft bg-panel2 text-primaryText",
          hasAttachment ? "min-w-[280px]" : "min-w-0",
          highlighted ? "ring-2 ring-white/70 ring-offset-2 ring-offset-background" : "",
          "cursor-context-menu"
        )}
      >
        <AnimatePresence>
          {popupType === "menu" && !editing ? (
            <MessageMenu
              key="message-menu"
              t={t}
              mine={mine}
              placement={popupPlacement}
              pinned={message.isPinned}
              copyMode={copyMode}
              currentUserId={currentUserId}
              reactions={message.reactions}
              onReaction={(emoji) => {
                void onToggleReaction(message, emoji);
                onPopupChange(null);
              }}
              onReply={() => {
                onReply(message);
                onPopupChange(null);
              }}
              onForward={() => {
                onForward(message);
                onPopupChange(null);
              }}
              onEdit={() => {
                setDraft(message.text);
                setEditing(true);
                onPopupChange(null);
              }}
              onCopy={() => {
                void copyMessageContent(message, attachmentUrl, copyMode);
                onPopupChange(null);
              }}
              onPin={async () => {
                await onPin(message);
                onPopupChange(null);
              }}
              onDelete={() => {
                onPopupChange("delete");
              }}
            />
          ) : null}
          {popupType === "reactions" && !editing ? (
            <ReactionPicker
              key="reaction-picker"
              mine={mine}
              placement={popupPlacement}
              label={t.chat.addReaction}
              onReaction={(emoji) => {
                void onToggleReaction(message, emoji);
                onPopupChange(null);
              }}
            />
          ) : null}
          {popupType === "delete" ? (
            <DeleteMenu
              key="delete-menu"
              t={t}
              mine={mine}
              placement={popupPlacement}
              onDeleteForMe={async () => {
                await onDelete(message, "me");
                onPopupChange(null);
              }}
              onDeleteForEveryone={async () => {
                await onDelete(message, "all");
                onPopupChange(null);
              }}
              onCancel={() => onPopupChange(null)}
            />
          ) : null}
        </AnimatePresence>
        {message.isPinned ? (
          <div className={cn("mb-2 flex items-center gap-1.5 text-[11px] font-medium", mine ? "text-white/75" : "text-secondaryText")}>
            <Pin size={12} />
            {t.chat.pinned}
          </div>
        ) : null}
        {message.replyToMessageId ? (
          <ReplyPreview
            mine={mine}
            t={t}
            message={replyToMessage}
            authorName={replyToAuthorName}
            onOpen={() => {
              if (replyToMessage) {
                onOpenReply(replyToMessage.id);
              }
            }}
          />
        ) : null}
        {attachmentUrl ? (
          <AttachmentPreview
            url={attachmentUrl}
            name={decodeLegacyFileName(message.attachmentName ?? "file")}
            mime={message.attachmentMime ?? "application/octet-stream"}
            size={message.attachmentSize}
            mine={mine}
            onOpenImage={onOpenImage}
          />
        ) : null}
        {editing ? (
          <div className="mt-1" onClick={(event) => event.stopPropagation()}>
            <textarea
              value={draft}
              maxLength={1000}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-20 w-72 max-w-full resize-none rounded-xl border border-white/20 bg-black/15 px-3 py-2 text-sm leading-5 text-white outline-none focus:border-white/45"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/16"
                aria-label={t.chat.cancelEdit}
                onClick={() => {
                  setEditing(false);
                  setDraft(message.text);
                }}
              >
                <X size={15} />
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/18 text-white transition hover:bg-white/25 disabled:opacity-50"
                aria-label={t.chat.saveEdit}
                disabled={!draft.trim() || busy}
                onClick={saveEdit}
              >
                <Check size={15} />
              </button>
            </div>
          </div>
        ) : message.text ? (
          <p className={cn("whitespace-pre-wrap break-words text-sm leading-5", attachmentUrl ? "mt-2.5" : "")}>
            {message.text}
          </p>
        ) : null}
        <div
          className={cn(
            "mt-1.5 flex items-center gap-1 text-[11px] leading-none",
            mine ? "justify-end text-white/68" : "justify-end text-secondaryText"
          )}
        >
          <span>
            {message.editedAt ? `${t.chat.edited} · ` : ""}
            {formatMessageTime(message.sentAt)}
          </span>
          {mine ? <MessageStatus message={message} /> : null}
        </div>
        {message.reactions.length ? (
          <ReactionSummary
            reactions={message.reactions}
            currentUserId={currentUserId}
            mine={mine}
            onReaction={(emoji) => void onToggleReaction(message, emoji)}
          />
        ) : null}
        {message.isForwarded ? (
          <div className={cn("mb-2 flex items-center gap-1.5 text-[11px] font-medium", mine ? "text-white/78" : "text-accent")}>
            <Forward size={12} />
            {t.chat.forwarded}
          </div>
        ) : null}
      </div>
      {!editing ? (
        <button
          type="button"
          aria-label={t.chat.addReaction}
          title={t.chat.addReaction}
          onClick={() => onPopupChange(popupType === "reactions" ? null : "reactions")}
          className={cn(
            "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl border border-borderSoft bg-panel/95 text-secondaryText opacity-0 shadow-lg backdrop-blur transition hover:border-accent/35 hover:text-primaryText group-hover:opacity-100",
            popupType === "reactions" && "opacity-100",
            mine ? "right-full mr-2" : "left-full ml-2"
          )}
        >
          <SmilePlus size={16} />
        </button>
      ) : null}
      </div>
    </motion.div>
  );
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

function MessageStatus({ message }: { message: MessageDTO }) {
  if (message.readAt || message.isRead) {
    return <CheckCheck size={15} strokeWidth={2.25} className="text-sky-200" />;
  }

  if (message.deliveredAt) {
    return <CheckCheck size={15} strokeWidth={2.25} className="text-white/62" />;
  }

  return <Check size={15} strokeWidth={2.35} className="text-white/62" />;
}

function ReplyPreview({
  mine,
  t,
  message,
  authorName,
  onOpen
}: {
  mine: boolean;
  t: Translation;
  message: MessageDTO | null;
  authorName: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!message}
      className={cn(
        "mb-2 flex w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
        mine
          ? "border-white/14 bg-white/[0.12] hover:bg-white/[0.17] disabled:hover:bg-white/[0.12]"
          : "border-borderSoft bg-background/55 hover:bg-white/[0.05] disabled:hover:bg-background/55"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <span className={cn("h-9 w-1 shrink-0 rounded-full", mine ? "bg-white/65" : "bg-accent")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-xs font-semibold", mine ? "text-white/86" : "text-accent")}>
          {message ? authorName || t.chat.originalMessage : t.chat.originalMessageUnavailable}
        </span>
        <span className={cn("mt-0.5 block truncate text-sm", mine ? "text-white/70" : "text-secondaryText")}>
          {message ? getMessagePreview(message, t) : t.chat.originalMessageUnavailable}
        </span>
      </span>
    </button>
  );
}

interface MessageMenuProps {
  t: Translation;
  mine: boolean;
  placement: "top" | "bottom";
  pinned: boolean;
  copyMode: CopyMode;
  currentUserId: string;
  reactions: MessageDTO["reactions"];
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onPin: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

function MessageMenu({
  t,
  mine,
  placement,
  pinned,
  copyMode,
  currentUserId,
  reactions,
  onReaction,
  onReply,
  onForward,
  onEdit,
  onCopy,
  onPin,
  onDelete
}: MessageMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: placement === "top" ? 8 : -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "absolute z-20 w-52 overflow-hidden rounded-2xl border border-borderSoft bg-panel/95 p-1 text-primaryText shadow-glow backdrop-blur",
        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
        mine ? "right-0" : "left-0"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-1 grid grid-cols-6 gap-0.5 border-b border-borderSoft p-1 pb-2">
        {QUICK_REACTIONS.map((emoji) => (
          <EmojiButton
            key={emoji}
            emoji={emoji}
            active={reactions.some((reaction) => reaction.emoji === emoji && reaction.userId === currentUserId)}
            onClick={() => onReaction(emoji)}
          />
        ))}
      </div>
      <MenuButton icon={<Reply size={15} />} label={t.chat.replyMessage} onClick={onReply} />
      <MenuButton icon={<Forward size={15} />} label={t.chat.forwardMessage} onClick={onForward} />
      {mine ? <MenuButton icon={<Pencil size={15} />} label={t.chat.editMessage} onClick={onEdit} /> : null}
      {copyMode ? <MenuButton icon={<Copy size={15} />} label={t.chat.copyMessage} onClick={onCopy} /> : null}
      <MenuButton icon={<Pin size={15} />} label={pinned ? t.chat.unpinMessage : t.chat.pinMessage} onClick={onPin} />
      <MenuButton danger icon={<Trash2 size={15} />} label={t.chat.deleteMessage} onClick={onDelete} />
    </motion.div>
  );
}

function ReactionPicker({
  mine,
  placement,
  label,
  onReaction
}: {
  mine: boolean;
  placement: "top" | "bottom";
  label: string;
  onReaction: (emoji: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: placement === "top" ? 7 : -7, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: placement === "top" ? 5 : -5, scale: 0.96 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      aria-label={label}
      className={cn(
        "absolute z-30 flex gap-1 rounded-2xl border border-borderSoft bg-panel/95 p-1.5 shadow-glow backdrop-blur",
        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
        mine ? "right-0" : "left-0"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <EmojiButton key={emoji} emoji={emoji} onClick={() => onReaction(emoji)} />
      ))}
    </motion.div>
  );
}

function EmojiButton({
  emoji,
  active,
  onClick
}: {
  emoji: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "grid h-8 w-8 place-items-center rounded-xl text-lg transition hover:bg-white/[0.09] hover:scale-110",
        active && "bg-accent/25 ring-1 ring-accent/50"
      )}
      onClick={onClick}
    >
      {emoji}
    </button>
  );
}

function ReactionSummary({
  reactions,
  currentUserId,
  mine,
  onReaction
}: {
  reactions: MessageDTO["reactions"];
  currentUserId: string;
  mine: boolean;
  onReaction: (emoji: string) => void;
}) {
  const groups = QUICK_REACTIONS.map((emoji) => {
    const matches = reactions.filter((reaction) => reaction.emoji === emoji);
    return {
      emoji,
      count: matches.length,
      active: matches.some((reaction) => reaction.userId === currentUserId)
    };
  }).filter((group) => group.count > 0);

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {groups.map((group) => (
        <motion.button
          layout
          key={group.emoji}
          type="button"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onReaction(group.emoji)}
          className={cn(
            "flex h-7 items-center gap-1 rounded-xl border px-2 text-sm transition",
            group.active
              ? mine
                ? "border-white/35 bg-white/20 text-white"
                : "border-accent/50 bg-accent/16 text-primaryText"
              : mine
                ? "border-white/16 bg-white/10 text-white/85 hover:bg-white/16"
                : "border-borderSoft bg-background/45 text-primaryText hover:bg-white/[0.06]"
          )}
        >
          <span>{group.emoji}</span>
          <span className="text-[11px] font-semibold">{group.count}</span>
        </motion.button>
      ))}
    </div>
  );
}

interface DeleteMenuProps {
  t: Translation;
  mine: boolean;
  placement: "top" | "bottom";
  onDeleteForMe: () => void | Promise<void>;
  onDeleteForEveryone: () => void | Promise<void>;
  onCancel: () => void;
}

function DeleteMenu({ t, mine, placement, onDeleteForMe, onDeleteForEveryone, onCancel }: DeleteMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: placement === "top" ? 8 : -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "absolute z-30 w-56 rounded-2xl border border-borderSoft bg-panel/95 p-2 text-primaryText shadow-glow backdrop-blur",
        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
        mine ? "right-0" : "left-0"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <p className="px-2 pb-2 pt-1 text-sm font-semibold">{t.chat.deleteQuestion}</p>
      <MenuButton icon={<Trash2 size={15} />} label={t.chat.deleteForMe} onClick={onDeleteForMe} />
      <MenuButton danger icon={<Trash2 size={15} />} label={t.chat.deleteForEveryone} onClick={onDeleteForEveryone} />
      <MenuButton icon={<X size={15} />} label={t.chat.cancelEdit} onClick={onCancel} />
    </motion.div>
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
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-red-200 hover:bg-red-500/20 hover:text-red-100" : "text-primaryText hover:bg-white/[0.07]"
      )}
      onClick={() => void onClick()}
    >
      {icon}
      {label}
    </button>
  );
}

interface AttachmentPreviewProps {
  url: string;
  name: string;
  mime: string;
  size: number | null;
  mine: boolean;
  onOpenImage: (image: { url: string; name: string }) => void;
}

function AttachmentPreview({ url, name, mime, size, mine, onOpenImage }: AttachmentPreviewProps) {
  const isPdf = mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");

  if (mime.startsWith("image/")) {
    return (
      <button
        type="button"
        className="block w-[320px] max-w-full overflow-hidden rounded-xl text-left transition hover:brightness-110"
        onClick={(event) => {
          event.stopPropagation();
          onOpenImage({ url, name });
        }}
      >
        <img src={url} alt={name} className="max-h-[260px] w-full object-cover" />
      </button>
    );
  }

  if (mime.startsWith("video/")) {
    return <video src={url} controls className="max-h-[260px] w-[360px] max-w-full rounded-xl bg-black" onClick={(event) => event.stopPropagation()} />;
  }

  if (mime.startsWith("audio/")) {
    return <AudioAttachment url={url} name={name} mine={mine} />;
  }

  if (isPdf) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-[360px] max-w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/[0.08]",
          mine ? "border-white/18 bg-white/[0.10]" : "border-borderSoft bg-background/55"
        )}
        onClick={(event) => {
          event.stopPropagation();
          void openExternalUrl(url);
        }}
      >
        <FileCardContent name={name} size={size} mine={mine} actionIcon={<ExternalLink size={17} className="shrink-0 opacity-75" />} />
      </button>
    );
  }

  return (
    <a
      href={url}
      download={name}
      className={cn(
        "flex w-[360px] max-w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:bg-white/[0.08]",
        mine ? "border-white/18 bg-white/[0.10]" : "border-borderSoft bg-background/55"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <FileCardContent name={name} size={size} mine={mine} />
    </a>
  );
}

function FileCardContent({
  name,
  size,
  mine,
  actionIcon = <Download size={17} className="shrink-0 opacity-75" />
}: {
  name: string;
  size: number | null;
  mine: boolean;
  actionIcon?: ReactNode;
}) {
  return (
    <>
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", mine ? "bg-white/14" : "bg-accent/14")}>
        <FileIcon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-5">{name}</p>
        <p className={cn("mt-0.5 text-xs leading-none", mine ? "text-white/68" : "text-secondaryText")}>
          {size ? formatFileSize(size) : "File"}
        </p>
      </div>
      {actionIcon}
    </>
  );
}

interface AudioAttachmentProps {
  url: string;
  name: string;
  mine: boolean;
}

function AudioAttachment({ url, name, mine }: AudioAttachmentProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "flex w-[320px] max-w-full items-center gap-3 rounded-xl border px-3 py-2.5",
        mine ? "border-white/18 bg-white/[0.10]" : "border-borderSoft bg-background/55"
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlayback}
        className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl transition", mine ? "bg-white/14 hover:bg-white/20" : "bg-accent/14 hover:bg-accent/20")}
        aria-label={name}
      >
        {playing ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold leading-5">{isVoiceMessage(name) ? "Voice message" : name}</p>
          <span className={cn("shrink-0 font-mono text-[11px]", mine ? "text-white/68" : "text-secondaryText")}>
            {formatDuration(currentTime || duration)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || currentTime)}
          onChange={(event) => seek(Number(event.target.value))}
          className="mt-1 h-1 w-full accent-white"
        />
      </div>
    </div>
  );
}

function getAttachmentUrl(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  return `${apiUrl}${value}`;
}

type CopyMode = "text" | "image" | null;

function getCopyMode(message: MessageDTO, attachmentUrl: string | null): CopyMode {
  if (attachmentUrl) {
    return isImageAttachment(message, attachmentUrl) ? "image" : null;
  }

  return message.text.trim() ? "text" : null;
}

function isImageAttachment(message: MessageDTO, attachmentUrl: string) {
  if (message.attachmentMime?.startsWith("image/")) return true;

  const name = message.attachmentName ?? attachmentUrl.split("?")[0];
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
}

async function copyMessageContent(message: MessageDTO, attachmentUrl: string | null, mode: CopyMode) {
  if (mode === "image" && attachmentUrl) {
    await window.minimalChatClipboard?.writeImage(attachmentUrl);
    return;
  }

  if (mode === "text") {
    await copyTextToClipboard(message.text);
  }
}

function getMessagePreview(message: MessageDTO, t: Translation) {
  return message.text.trim() || message.attachmentName || t.chat.originalMessage;
}

async function copyTextToClipboard(value: string) {
  if (window.minimalChatClipboard) {
    await window.minimalChatClipboard.writeText(value);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    copyTextToClipboardWithSelection(value);
  }
}

function copyTextToClipboardWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function openExternalUrl(url: string) {
  if (window.minimalChatApp?.openExternal) {
    await window.minimalChatApp.openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const rest = (value % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function isVoiceMessage(name: string) {
  return name.toLowerCase().startsWith("voice-message-");
}

function decodeLegacyFileName(name: string) {
  if (!/[ÐÑР]/.test(name)) return name;

  try {
    const bytes = Uint8Array.from(Array.from(name, (char) => char.charCodeAt(0) & 255));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return name;
  }
}
