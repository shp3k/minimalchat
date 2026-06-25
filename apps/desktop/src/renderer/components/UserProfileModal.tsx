import type { MessageDTO, UserListItemDTO } from "@minimalchat/shared";
import { AtSign, CalendarDays, FileIcon, Images, Mail, ShieldBan, UserMinus, UserPlus, UserRound, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getAttachmentUrl } from "@/components/MessageBubble";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Language, Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface UserProfileModalProps {
  user: UserListItemDTO;
  messages: MessageDTO[];
  language: Language;
  t: Translation;
  onClose: () => void;
  onOpenImage: (image: { url: string; name: string }) => void;
  onContactChange: (enabled: boolean) => Promise<void>;
  onBlockChange: (enabled: boolean) => Promise<void>;
}

export function UserProfileModal({ user, messages, language, t, onClose, onOpenImage, onContactChange, onBlockChange }: UserProfileModalProps) {
  const [tab, setTab] = useState<"media" | "files">("media");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const attachments = useMemo(
    () => messages.filter((message) => message.attachmentUrl && message.attachmentName),
    [messages]
  );
  const media = attachments.filter((message) => isMedia(message));
  const files = attachments.filter((message) => !isMedia(message));
  const items = tab === "media" ? media : files;

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 160);
    return () => window.clearTimeout(timer);
  }, [user.id]);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 px-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="flex max-h-[min(680px,calc(100%-32px))] w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] border border-borderSoft bg-panel shadow-glow"
      >
        <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar username={user.username} avatarUrl={user.avatarUrl} online={user.online} className="h-16 w-16 rounded-full" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-primaryText">{user.username}</h2>
              <p className="mt-1 truncate text-sm text-secondaryText">
                {user.handle ? `@${user.handle}` : user.email}
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={t.profile.close} onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {!ready ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-5">
            <div className="skeleton h-11 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
            <div className="grid grid-cols-3 gap-2 pt-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 border-b border-borderSoft p-4">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onContactChange(!user.isContact);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {user.isContact ? <UserMinus size={16} /> : <UserPlus size={16} />}
              {user.isContact ? t.chat.removeContact : t.chat.addContact}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              className={user.isBlockedByMe ? "text-secondaryText" : "text-red-300 hover:bg-red-500/10 hover:text-red-200"}
              onClick={async () => {
                setBusy(true);
                try {
                  await onBlockChange(!user.isBlockedByMe);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ShieldBan size={16} />
              {user.isBlockedByMe ? t.chat.unblockUser : t.chat.blockUser}
            </Button>
          </div>
          <div className="space-y-3 border-b border-borderSoft p-5">
            <InfoRow icon={<UserRound size={16} />} label={t.profile.bio}>
              {user.bio || t.profile.bioEmpty}
            </InfoRow>
            <InfoRow icon={<AtSign size={16} />} label={t.profile.handle}>
              {user.handle ? `@${user.handle}` : "-"}
            </InfoRow>
            {user.email ? (
              <InfoRow icon={<Mail size={16} />} label={t.auth.email}>
                {user.email}
              </InfoRow>
            ) : null}
            <InfoRow icon={<CalendarDays size={16} />} label={t.profile.registeredAt}>
              {formatRegistrationDate(user.createdAt, language)}
            </InfoRow>
          </div>

          <div className="sticky top-0 z-10 flex border-b border-borderSoft bg-panel/95 px-5 pt-3 backdrop-blur">
            <TabButton active={tab === "media"} onClick={() => setTab("media")}>
              <Images size={16} />
              {t.profile.sharedMedia} ({media.length})
            </TabButton>
            <TabButton active={tab === "files"} onClick={() => setTab("files")}>
              <FileIcon size={16} />
              {t.profile.sharedFiles} ({files.length})
            </TabButton>
          </div>

          <div className="p-4">
            {items.length ? (
              tab === "media" ? (
                <div className="grid grid-cols-3 gap-2">
                  {media.map((message) => (
                    <MediaItem key={message.id} message={message} onOpenImage={onOpenImage} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((message) => (
                    <FileItem key={message.id} message={message} t={t} />
                  ))}
                </div>
              )
            ) : (
              <div className="grid min-h-36 place-items-center text-center text-sm text-secondaryText">
                {tab === "media" ? t.profile.noSharedMedia : t.profile.noSharedFiles}
              </div>
            )}
          </div>
        </div>
        )}
      </motion.div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-borderSoft bg-background/55 px-4 py-3">
      <span className="mt-0.5 text-accent">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-secondaryText">{label}</span>
        <span className="mt-1 block whitespace-pre-wrap break-words text-sm leading-5 text-primaryText">{children}</span>
      </span>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 flex-1 items-center justify-center gap-2 border-b-2 text-sm font-medium transition",
        active ? "border-accent text-primaryText" : "border-transparent text-secondaryText hover:text-primaryText"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MediaItem({
  message,
  onOpenImage
}: {
  message: MessageDTO;
  onOpenImage: (image: { url: string; name: string }) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const url = getAttachmentUrl(message.attachmentUrl);
  if (!url) return null;
  const name = message.attachmentName || "media";

  if (message.attachmentMime?.startsWith("image/")) {
    return (
      <button
        type="button"
        className={cn("aspect-square overflow-hidden rounded-xl border border-borderSoft bg-background transition hover:brightness-110", !loaded && "skeleton")}
        onClick={() => onOpenImage({ url, name })}
      >
        <img src={url} alt={name} onLoad={() => setLoaded(true)} className={cn("h-full w-full object-cover transition-opacity", loaded ? "opacity-100" : "opacity-0")} />
      </button>
    );
  }

  return (
    <video
      src={url}
      controls
      preload="metadata"
      className="aspect-square w-full rounded-xl border border-borderSoft bg-black object-cover"
    />
  );
}

function FileItem({ message, t }: { message: MessageDTO; t: Translation }) {
  const url = getAttachmentUrl(message.attachmentUrl);
  if (!url) return null;
  const name = message.attachmentName || "file";
  const isPdf = message.attachmentMime === "application/pdf" || name.toLowerCase().endsWith(".pdf");

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-borderSoft bg-background/55 px-3 py-3 text-left transition hover:bg-white/[0.05]"
      onClick={() => {
        if (isPdf) {
          void window.minimalChatApp?.openExternal(url);
          return;
        }

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = name;
        anchor.click();
      }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <FileIcon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-primaryText">{name}</span>
        <span className="mt-1 block text-xs text-secondaryText">
          {message.attachmentSize ? formatFileSize(message.attachmentSize) : t.chat.originalMessage}
        </span>
      </span>
    </button>
  );
}

function isMedia(message: MessageDTO) {
  return Boolean(
    message.attachmentMime?.startsWith("image/") ||
      message.attachmentMime?.startsWith("video/")
  );
}

function formatRegistrationDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
