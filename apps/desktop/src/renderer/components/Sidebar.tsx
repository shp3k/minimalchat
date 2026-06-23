import type { UserDTO } from "@minimalchat/shared";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface SidebarProps {
  user: UserDTO;
  unreadCount: number;
  onProfileOpen: () => void;
}

export function Sidebar({ user, unreadCount, onProfileOpen }: SidebarProps) {
  const hasUnread = unreadCount > 0;
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <aside className="flex w-[78px] shrink-0 flex-col items-center justify-between border-r border-borderSoft bg-background px-3 py-5">
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid h-12 w-12 place-items-center rounded-3xl bg-accent text-white shadow-accent">
          <MessageCircle size={23} />
          {hasUnread ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-background bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-[0_0_18px_rgba(239,68,68,0.45)]">
              {unreadLabel}
            </span>
          ) : null}
        </div>
        <div className="h-px w-10 bg-borderSoft" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <button type="button" className="rounded-3xl outline-none ring-accent/40 transition hover:scale-105 focus:ring-4" onClick={onProfileOpen}>
          <Avatar username={user.username} avatarUrl={user.avatarUrl} online className="h-12 w-12 rounded-full" />
        </button>
      </div>
    </aside>
  );
}
