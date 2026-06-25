import type { UserDTO } from "@minimalchat/shared";
import type { Language } from "@/lib/i18n";

const USER_KEY = "minimalchat:user";
const LANGUAGE_KEY = "minimalchat:language";
const SOUND_SETTINGS_KEY = "minimalchat:sound-settings";
const DRAFTS_KEY = "minimalchat:drafts";
const THEME_KEY = "minimalchat:theme";

export type Theme = "dark" | "light";

export interface ChatDraft {
  text: string;
  updatedAt: string;
}

export type ChatDrafts = Record<string, ChatDraft>;

export interface SoundSettings {
  notifications: boolean;
  sentMessages: boolean;
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  notifications: true,
  sentMessages: true
};

export function getStoredUser(): UserDTO | null {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;

  try {
    const user = JSON.parse(value) as UserDTO;
    return {
      ...user,
      bio: user.bio ?? "",
      onlineVisibility: user.onlineVisibility ?? "everyone",
      avatarVisibility: user.avatarVisibility ?? "everyone",
      emailVisibility: user.emailVisibility ?? "nobody",
      lastSeenVisibility: user.lastSeenVisibility ?? (user.hideLastSeen ? "nobody" : "everyone")
    };
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function storeUser(user: UserDTO) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}

export function getStoredLanguage(): Language {
  const value = localStorage.getItem(LANGUAGE_KEY);
  return value === "en" || value === "ru" ? value : "ru";
}

export function storeLanguage(language: Language) {
  localStorage.setItem(LANGUAGE_KEY, language);
}

export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function storeTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function getStoredSoundSettings(): SoundSettings {
  const value = localStorage.getItem(SOUND_SETTINGS_KEY);
  if (!value) return DEFAULT_SOUND_SETTINGS;

  try {
    const parsed = JSON.parse(value) as Partial<SoundSettings>;

    return {
      notifications: parsed.notifications !== false,
      sentMessages: parsed.sentMessages !== false
    };
  } catch {
    localStorage.removeItem(SOUND_SETTINGS_KEY);
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function storeSoundSettings(settings: SoundSettings) {
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
}

export function getStoredDrafts(userId: string): ChatDrafts {
  const value = localStorage.getItem(`${DRAFTS_KEY}:${userId}`);
  if (!value) return {};

  try {
    return JSON.parse(value) as ChatDrafts;
  } catch {
    localStorage.removeItem(`${DRAFTS_KEY}:${userId}`);
    return {};
  }
}

export function storeDrafts(userId: string, drafts: ChatDrafts) {
  localStorage.setItem(`${DRAFTS_KEY}:${userId}`, JSON.stringify(drafts));
}
