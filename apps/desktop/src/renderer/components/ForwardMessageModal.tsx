import type { MessageDTO, UserListItemDTO } from "@minimalchat/shared";
import { Bookmark, Forward, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Translation } from "@/lib/i18n";

interface ForwardMessageModalProps {
  message: MessageDTO;
  users: UserListItemDTO[];
  query: string;
  loading: boolean;
  sendingUserId: string | null;
  t: Translation;
  onQueryChange: (value: string) => void;
  onSelect: (user: UserListItemDTO) => void;
  onClose: () => void;
}

export function ForwardMessageModal({
  message,
  users,
  query,
  loading,
  sendingUserId,
  t,
  onQueryChange,
  onSelect,
  onClose
}: ForwardMessageModalProps) {
  const hasSearch = Boolean(query.trim());

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 px-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="flex max-h-[min(620px,calc(100%-32px))] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-borderSoft bg-panel shadow-glow"
      >
        <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Forward size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-primaryText">{t.chat.forwardMessage}</h2>
              <p className="mt-0.5 truncate text-xs text-secondaryText">{getForwardPreview(message, t)}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={t.profile.close} onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="border-b border-borderSoft p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText" size={17} />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t.chat.searchUsers}
              className="pl-11"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : users.length ? (
            <div className="space-y-1.5">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={Boolean(sendingUserId)}
                  onClick={() => onSelect(user)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition hover:border-borderSoft hover:bg-white/[0.05] disabled:opacity-50"
                >
                  {user.isSavedMessages ? (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white shadow-accent">
                      <Bookmark size={17} fill="currentColor" />
                    </div>
                  ) : (
                    <Avatar username={user.username} avatarUrl={user.avatarUrl} online={user.online} className="h-10 w-10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primaryText">
                      {user.isSavedMessages ? t.chat.savedMessages : user.username}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-secondaryText">
                      {user.isSavedMessages
                        ? t.chat.savedMessagesHint
                        : user.handle
                          ? `@${user.handle}`
                          : user.email}
                    </p>
                  </div>
                  {sendingUserId === user.id ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                  ) : (
                    <Forward size={16} className="text-secondaryText" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm leading-6 text-secondaryText">
              {hasSearch ? t.chat.noSearchResults : t.chat.noUsers}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function getForwardPreview(message: MessageDTO, t: Translation) {
  const value = message.text.trim() || message.attachmentName || t.chat.originalMessage;
  return value.length > 58 ? `${value.slice(0, 55)}...` : value;
}
