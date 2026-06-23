import type { MessageDTO, UserListItemDTO } from "@minimalchat/shared";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Translation } from "@/lib/i18n";
import { getPresenceText } from "@/lib/presence";
import { cn, formatMessageTime } from "@/lib/utils";

interface UserListProps {
  users: UserListItemDTO[];
  selectedUserId?: string;
  loading: boolean;
  query: string;
  t: Translation;
  emptyMode: "conversations" | "hint" | "search";
  onQueryChange: (value: string) => void;
  onSelect: (user: UserListItemDTO) => void;
}

function preview(message: MessageDTO | null | undefined, t: Translation) {
  if (!message) return t.chat.noMessagesYet;
  if (!message.text && message.attachmentName) return message.attachmentName;
  return message.text.length > 46 ? `${message.text.slice(0, 46)}...` : message.text;
}

export function UserList({ users, selectedUserId, loading, query, t, emptyMode, onQueryChange, onSelect }: UserListProps) {
  const emptyText =
    emptyMode === "hint" ? t.chat.searchHint : emptyMode === "search" ? t.chat.noSearchResults : t.chat.noUsers;

  return (
    <section className="flex w-[330px] shrink-0 flex-col border-r border-borderSoft bg-panel">
      <div className="border-b border-borderSoft p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">{t.chat.messages}</p>
          <h1 className="mt-1 text-2xl font-semibold text-primaryText">{t.chat.inbox}</h1>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText" size={17} />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t.chat.searchUsers}
            className="pl-11"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[76px] animate-pulse rounded-3xl bg-white/[0.04]" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm leading-6 text-secondaryText">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <UserCard key={user.id} user={user} selected={selectedUserId === user.id} t={t} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function UserCard({
  user,
  selected,
  t,
  onSelect
}: {
  user: UserListItemDTO;
  selected: boolean;
  t: Translation;
  onSelect: (user: UserListItemDTO) => void;
}) {
  const hasUnread = !selected && user.unreadCount > 0;
  const fallbackPreview = user.lastMessage ? preview(user.lastMessage, t) : getPresenceText(user, t);

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(user)}
      className={cn(
        "flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition duration-200",
        selected
          ? "border-accent/40 bg-accent/12 shadow-accent"
          : hasUnread
            ? "border-accent/25 bg-accent/8 hover:border-accent/35 hover:bg-accent/12"
            : "border-transparent bg-transparent hover:border-borderSoft hover:bg-white/[0.04]"
      )}
    >
      <Avatar username={user.username} avatarUrl={user.avatarUrl} online={user.online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={cn("truncate text-sm font-semibold", hasUnread ? "text-white" : "text-primaryText")}>
            {user.username}
          </p>
          {user.lastMessage ? (
            <span className={cn("shrink-0 text-[11px]", hasUnread ? "font-semibold text-accent" : "text-secondaryText")}>
              {formatMessageTime(user.lastMessage.sentAt)}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={cn("min-w-0 flex-1 truncate text-xs", hasUnread ? "font-semibold text-primaryText" : "text-secondaryText")}>
            {fallbackPreview}
          </p>
          {hasUnread ? (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-white shadow-accent">
              {user.unreadCount > 99 ? "99+" : user.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}
