import type { UserDTO } from "@minimalchat/shared";
import type { Translation } from "@/lib/i18n";

const JUST_NOW_MILLISECONDS = 60_000;

export function getPresenceText(
  user: Pick<UserDTO, "online" | "lastSeenAt" | "hideLastSeen">,
  t: Translation,
  now = Date.now()
) {
  if (user.online) {
    return t.chat.online;
  }

  if (user.hideLastSeen) {
    return t.chat.lastSeenRecently;
  }

  if (!user.lastSeenAt) {
    return t.chat.offline;
  }

  const lastSeenDate = new Date(user.lastSeenAt);

  if (Number.isNaN(lastSeenDate.getTime())) {
    return t.chat.offline;
  }

  if (now - lastSeenDate.getTime() < JUST_NOW_MILLISECONDS) {
    return t.chat.lastSeenJustNow;
  }

  return `${t.chat.lastSeenAt} ${lastSeenDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}
