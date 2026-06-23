import type { UserDTO } from "@minimalchat/shared";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, EyeOff, Info, Languages, LogOut, Send, Volume2, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Language, Translation } from "@/lib/i18n";
import type { SoundSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  t: Translation;
  user: UserDTO;
  language: Language;
  soundSettings: SoundSettings;
  privacyLoading: boolean;
  onClose: () => void;
  onLanguageChange: (language: Language) => void;
  onSoundSettingsChange: (settings: SoundSettings) => void;
  onLastSeenPrivacyChange: (hideLastSeen: boolean) => void;
  onLogout: () => void;
}

export function SettingsModal({
  t,
  user,
  language,
  soundSettings,
  privacyLoading,
  onClose,
  onLanguageChange,
  onSoundSettingsChange,
  onLastSeenPrivacyChange,
  onLogout
}: SettingsModalProps) {
  const [version, setVersion] = useState("...");

  useEffect(() => {
    let active = true;

    window.minimalChatApp
      ?.getVersion()
      .then((value) => {
        if (active) setVersion(value);
      })
      .catch(() => {
        if (active) setVersion("-");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/55 px-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="max-h-[calc(100%-32px)] w-full max-w-[380px] overflow-y-auto rounded-[28px] border border-borderSoft bg-panel p-5 shadow-glow"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primaryText">{t.profile.settings}</h2>
            <p className="mt-1 text-sm text-secondaryText">{t.profile.language}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={t.profile.close} onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="rounded-3xl border border-borderSoft bg-background p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primaryText">
            <Languages size={16} className="text-accent" />
            {t.profile.language}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["ru", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  "h-11 rounded-2xl border text-sm font-semibold transition",
                  language === item
                    ? "border-accent bg-accent text-white shadow-accent"
                    : "border-borderSoft bg-panel text-secondaryText hover:border-white/18 hover:text-primaryText"
                )}
                onClick={() => onLanguageChange(item)}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-borderSoft bg-background p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
              <EyeOff size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primaryText">{t.profile.hideLastSeen}</p>
              <p className="mt-1 text-xs leading-5 text-secondaryText">{t.profile.hideLastSeenHelp}</p>
            </div>
            <SettingsSwitch
              checked={user.hideLastSeen}
              label={t.profile.hideLastSeen}
              disabled={privacyLoading}
              className="mt-1"
              onChange={onLastSeenPrivacyChange}
            />
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-borderSoft bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primaryText">
            <Volume2 size={16} className="text-accent" />
            {t.profile.sounds}
          </div>
          <SoundSettingRow
            icon={<Bell size={15} />}
            label={t.profile.notificationSound}
            checked={soundSettings.notifications}
            onChange={(notifications) => onSoundSettingsChange({ ...soundSettings, notifications })}
          />
          <SoundSettingRow
            icon={<Send size={15} />}
            label={t.profile.sentMessageSound}
            checked={soundSettings.sentMessages}
            onChange={(sentMessages) => onSoundSettingsChange({ ...soundSettings, sentMessages })}
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-borderSoft bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-secondaryText">
            <Info size={16} className="text-accent" />
            {t.profile.version}
          </div>
          <span className="text-sm font-semibold text-primaryText">{version}</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-4 w-full justify-start rounded-2xl text-red-200 hover:bg-red-500/12 hover:text-red-100"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <LogOut size={16} />
          {t.profile.logout}
        </Button>
      </motion.div>
    </div>
  );
}

function SoundSettingRow({
  icon,
  label,
  checked,
  onChange
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-10 items-center gap-3 border-t border-borderSoft first-of-type:border-t-0">
      <span className="text-secondaryText">{icon}</span>
      <span className="min-w-0 flex-1 text-sm text-primaryText">{label}</span>
      <SettingsSwitch checked={checked} label={label} onChange={onChange} />
    </div>
  );
}

function SettingsSwitch({
  checked,
  label,
  disabled,
  className,
  onChange
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  className?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-borderSoft bg-panel2",
        className
      )}
    >
      <span
        className={cn(
          "absolute left-[3px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0"
        )}
      />
    </button>
  );
}
