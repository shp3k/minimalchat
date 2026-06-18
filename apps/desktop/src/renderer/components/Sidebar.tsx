import type { UserDTO } from "@minimalchat/shared";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface SidebarProps {
  user: UserDTO;
  onProfileOpen: () => void;
}

export function Sidebar({ user, onProfileOpen }: SidebarProps) {
  return (
    <aside className="flex w-[78px] shrink-0 flex-col items-center justify-between border-r border-borderSoft bg-background px-3 py-5">
      <div className="flex flex-col items-center gap-6">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-accent text-white shadow-accent">
          <MessageCircle size={23} />
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
