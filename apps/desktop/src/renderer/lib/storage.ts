import type { UserDTO } from "@minimalchat/shared";
import type { Language } from "@/lib/i18n";

const USER_KEY = "minimalchat:user";
const LANGUAGE_KEY = "minimalchat:language";
const SOUND_SETTINGS_KEY = "minimalchat:sound-settings";

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
    return JSON.parse(value) as UserDTO;
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
