import type { UserDTO } from "@minimalchat/shared";
import type { Translation } from "@/lib/i18n";

const RECENTLY_ONLINE_MINUTES = 5;

export function getPresenceText(user: Pick<UserDTO, "online" | "lastSeenAt">, t: Translation) {
  if (user.online) {
    return t.chat.online;
  }

  if (!user.lastSeenAt) {
    return t.chat.lastSeenRecently;
  }

  const lastSeenDate = new Date(user.lastSeenAt);

  if (Number.isNaN(lastSeenDate.getTime())) {
    return t.chat.lastSeenRecently;
  }

  const minutesSinceLastSeen = (Date.now() - lastSeenDate.getTime()) / 60000;

  if (minutesSinceLastSeen < RECENTLY_ONLINE_MINUTES) {
    return t.chat.lastSeenRecently;
  }

  return `${t.chat.lastSeenAt} ${lastSeenDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}
