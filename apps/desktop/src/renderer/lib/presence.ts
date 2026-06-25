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

  const currentDate = new Date(now);
  const time = lastSeenDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  const daysAgo =
    (Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()) -
      Date.UTC(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate())) /
    86_400_000;

  if (daysAgo === 0) {
    return `${t.chat.lastSeenAt} ${time}`;
  }

  if (daysAgo === 1) {
    return `${t.chat.lastSeenYesterdayAt} ${time}`;
  }

  const russian = t.chat.online === "онлайн";
  const date = lastSeenDate.toLocaleDateString(russian ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    ...(lastSeenDate.getFullYear() === currentDate.getFullYear() ? {} : { year: "numeric" })
  });

  return russian
    ? `${t.chat.lastSeenOn} ${date} в ${time}`
    : `${t.chat.lastSeenOn} ${date} at ${time}`;
}
