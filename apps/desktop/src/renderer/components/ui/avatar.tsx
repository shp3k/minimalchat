import { cn, getInitial } from "@/lib/utils";

interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  online?: boolean;
  className?: string;
}

export function Avatar({ username, avatarUrl, online, className }: AvatarProps) {
  return (
    <div className={cn("relative h-11 w-11 shrink-0 rounded-full", className)}>
      <div
        className="grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br from-accent to-accent2 text-sm font-semibold text-white shadow-accent"
        style={{ borderRadius: "inherit" }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitial(username)
        )}
      </div>
      <span
        className={cn(
          "absolute bottom-[5%] right-[5%] h-3.5 w-3.5 translate-x-[30%] translate-y-[30%] rounded-full border-[3px] border-background shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          online ? "bg-emerald-400" : "bg-zinc-600"
        )}
      />
    </div>
  );
}
