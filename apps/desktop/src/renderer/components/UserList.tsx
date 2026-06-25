import type { MessageDTO, SpaceDTO, UserListItemDTO } from "@minimalchat/shared";
import { BellOff, Bookmark, Plus, Radio, Search, ShieldBan, Users } from "lucide-react";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Translation } from "@/lib/i18n";
import { getPresenceText } from "@/lib/presence";
import type { ChatDrafts } from "@/lib/storage";
import { cn, formatMessageTime } from "@/lib/utils";

interface UserListProps {
  users: UserListItemDTO[];
  spaces: SpaceDTO[];
  selectedUserId?: string;
  selectedSpaceId?: string;
  loading: boolean;
  query: string;
  t: Translation;
  drafts: ChatDrafts;
  emptyMode: "conversations" | "hint" | "search";
  mode: "chats" | "contacts" | "groups" | "channels";
  onModeChange: (mode: "chats" | "contacts" | "groups" | "channels") => void;
  onCreateSpace: () => void;
  onSelectSpace: (space: SpaceDTO) => void;
  onQueryChange: (value: string) => void;
  onSelect: (user: UserListItemDTO) => void;
}

function preview(message: MessageDTO | null | undefined, t: Translation) {
  if (!message) return t.chat.noMessagesYet;
  if (!message.text && message.attachmentName) return message.attachmentName;
  return message.text.length > 46 ? `${message.text.slice(0, 46)}...` : message.text;
}

export function UserList({ users, spaces, selectedUserId, selectedSpaceId, loading, query, t, drafts, emptyMode, mode, onModeChange, onCreateSpace, onQueryChange, onSelect, onSelectSpace }: UserListProps) {
  const emptyText =
    mode === "contacts"
      ? t.chat.noContacts
      : mode === "groups"
        ? t.chat.noGroups
        : mode === "channels"
          ? t.chat.noChannels
      : emptyMode === "hint"
        ? t.chat.searchHint
        : emptyMode === "search"
          ? t.chat.noSearchResults
          : t.chat.noUsers;

  return (
    <section className="flex w-[330px] shrink-0 flex-col border-r border-borderSoft bg-panel">
      <div className="border-b border-borderSoft p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">{t.chat.messages}</p>
          <h1 className="mt-1 text-2xl font-semibold text-primaryText">{t.chat.inbox}</h1>
        </div>
        <div className="mb-3 grid grid-cols-4 rounded-xl bg-background p-1">
          {(["chats", "contacts", "groups", "channels"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "h-9 rounded-lg text-sm font-semibold transition",
                mode === item ? "bg-panel2 text-primaryText shadow-sm" : "text-secondaryText hover:text-primaryText"
              )}
              onClick={() => onModeChange(item)}
            >
              <span className="text-[11px]">{item === "chats" ? t.chat.chats : item === "contacts" ? t.chat.contacts : item === "groups" ? t.chat.groups : t.chat.channels}</span>
            </button>
          ))}
        </div>
        {mode === "groups" || mode === "channels" ? (
          <button type="button" className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/10 text-sm font-semibold text-accent transition hover:bg-accent/15" onClick={onCreateSpace}>
            <Plus size={16} />
            {mode === "groups" ? t.chat.createGroup : t.chat.createChannel}
          </button>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText" size={17} />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={mode === "contacts" ? `${t.chat.contacts}...` : mode === "groups" ? `${t.chat.groups}...` : mode === "channels" ? `${t.chat.channels}...` : t.chat.searchUsers}
            className="pl-11"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex h-[76px] items-center gap-3 rounded-2xl px-3">
                <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-3 w-2/5 rounded-full" />
                  <div className="skeleton h-2.5 w-4/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (mode === "groups" || mode === "channels") && spaces.length ? (
          <div className="space-y-2">
            {spaces.map((space) => (
              <button key={space.id} type="button" className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", selectedSpaceId === space.id ? "border-accent/40 bg-accent/12" : "border-transparent hover:border-borderSoft hover:bg-background")} onClick={() => onSelectSpace(space)}>
                {space.avatarUrl ? <img src={space.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white">{space.type === "group" ? <Users size={20} /> : <Radio size={20} />}</div>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-primaryText">{space.title}</span><span className="mt-1 block truncate text-xs text-secondaryText">{space.lastMessage?.text || `${space.memberCount} ${t.chat.participants.toLowerCase()}`}</span></span>
              </button>
            ))}
          </div>
        ) : ((mode === "groups" || mode === "channels") ? spaces.length === 0 : users.length === 0) ? (
          <div className="px-4 py-12 text-center text-sm leading-6 text-secondaryText">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <UserCard key={user.id} user={user} selected={selectedUserId === user.id} t={t} draft={drafts[user.id]} onSelect={onSelect} />
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
  draft,
  onSelect
}: {
  user: UserListItemDTO;
  selected: boolean;
  t: Translation;
  draft?: ChatDrafts[string];
  onSelect: (user: UserListItemDTO) => void;
}) {
  const hasUnread = !selected && user.unreadCount > 0;
  const displayName = user.isSavedMessages ? t.chat.savedMessages : user.username;
  const fallbackPreview = draft?.text.trim()
    ? draft.text.trim()
    : user.lastMessage
    ? preview(user.lastMessage, t)
    : user.isSavedMessages
      ? t.chat.savedMessagesHint
      : getPresenceText(user, t);

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
      {user.isSavedMessages ? (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-accent">
          <Bookmark size={20} fill="currentColor" />
        </div>
      ) : (
        <Avatar username={user.username} avatarUrl={user.avatarUrl} online={user.online} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className={cn("truncate text-sm font-semibold", hasUnread ? "text-white" : "text-primaryText")}>
              {displayName}
            </p>
            {user.isBlockedByMe ? <ShieldBan size={13} className="shrink-0 text-red-400" /> : null}
            {user.notificationsMuted ? <BellOff size={13} className="shrink-0 text-secondaryText" /> : null}
          </div>
          {draft || user.lastMessage ? (
            <span className={cn("shrink-0 text-[11px]", hasUnread ? "font-semibold text-accent" : "text-secondaryText")}>
              {formatMessageTime(draft?.updatedAt ?? user.lastMessage?.sentAt ?? "")}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={cn("min-w-0 flex-1 truncate text-xs", hasUnread ? "font-semibold text-primaryText" : "text-secondaryText")}>
            {draft?.text.trim() ? <span className="mr-1 font-semibold text-red-300">{t.chat.draft}:</span> : null}
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
