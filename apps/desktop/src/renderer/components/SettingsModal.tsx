import type { PrivacySettingsDTO, ProfileVisibility, UserDTO } from "@minimalchat/shared";
import { Bell, Info, Languages, LockKeyhole, LogOut, Mail, Moon, Send, Shield, Sun, Volume2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Language, Translation } from "@/lib/i18n";
import type { SoundSettings, Theme } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  t: Translation;
  user: UserDTO;
  language: Language;
  theme: Theme;
  soundSettings: SoundSettings;
  busy: boolean;
  onClose: () => void;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onSoundSettingsChange: (settings: SoundSettings) => void;
  onPrivacyChange: (settings: PrivacySettingsDTO) => Promise<void>;
  onEmailChange: (email: string) => Promise<string>;
  onPasswordChange: (password: string) => Promise<string>;
  onLogout: () => void;
}

export function SettingsModal({
  t,
  user,
  language,
  theme,
  soundSettings,
  busy,
  onClose,
  onLanguageChange,
  onThemeChange,
  onSoundSettingsChange,
  onPrivacyChange,
  onEmailChange,
  onPasswordChange,
  onLogout
}: SettingsModalProps) {
  const [version, setVersion] = useState("...");
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    window.minimalChatApp?.getVersion().then((value) => active && setVersion(value)).catch(() => active && setVersion("-"));
    return () => {
      active = false;
    };
  }, []);

  const privacy: PrivacySettingsDTO = {
    onlineVisibility: user.onlineVisibility,
    avatarVisibility: user.avatarVisibility,
    emailVisibility: user.emailVisibility,
    lastSeenVisibility: user.lastSeenVisibility
  };

  async function saveEmail() {
    if (!email.trim() || email.trim() === user.email) return;
    setMessage(await onEmailChange(email.trim()));
  }

  async function savePassword() {
    if (password.length < 6) return;
    setMessage(await onPasswordChange(password));
    setPassword("");
  }

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/55 px-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="max-h-[calc(100%-32px)] w-full max-w-[560px] overflow-y-auto rounded-[24px] border border-borderSoft bg-panel p-5 shadow-glow"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primaryText">{t.profile.settings}</h2>
            <p className="mt-1 text-sm text-secondaryText">{user.email}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={t.profile.close} onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {message ? <div className="mb-3 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-primaryText">{message}</div> : null}

        <Section title={t.profile.appearance} icon={<Sun size={16} />}>
          <div className="grid grid-cols-2 gap-2">
            <Choice active={theme === "dark"} icon={<Moon size={15} />} label={t.profile.darkTheme} onClick={() => onThemeChange("dark")} />
            <Choice active={theme === "light"} icon={<Sun size={15} />} label={t.profile.lightTheme} onClick={() => onThemeChange("light")} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["ru", "en"] as const).map((item) => (
              <Choice
                key={item}
                active={language === item}
                icon={<Languages size={15} />}
                label={item.toUpperCase()}
                onClick={() => onLanguageChange(item)}
              />
            ))}
          </div>
        </Section>

        <Section title={t.profile.privacy} icon={<Shield size={16} />}>
          <PrivacyRow label={t.profile.onlineVisibility} value={privacy.onlineVisibility} t={t} disabled={busy} onChange={(value) => onPrivacyChange({ ...privacy, onlineVisibility: value })} />
          <PrivacyRow label={t.profile.avatarVisibility} value={privacy.avatarVisibility} t={t} disabled={busy} onChange={(value) => onPrivacyChange({ ...privacy, avatarVisibility: value })} />
          <PrivacyRow label={t.profile.emailVisibility} value={privacy.emailVisibility} t={t} disabled={busy} onChange={(value) => onPrivacyChange({ ...privacy, emailVisibility: value })} />
          <PrivacyRow label={t.profile.lastSeenVisibility} value={privacy.lastSeenVisibility} t={t} disabled={busy} onChange={(value) => onPrivacyChange({ ...privacy, lastSeenVisibility: value })} />
        </Section>

        <Section title={t.profile.account} icon={<LockKeyhole size={16} />}>
          <div className="flex gap-2">
            <Input value={email} type="email" placeholder={t.profile.newEmail} onChange={(event) => setEmail(event.target.value)} />
            <Button type="button" disabled={busy || !email.trim() || email.trim() === user.email} onClick={() => void saveEmail()}>
              <Mail size={16} />
              {t.profile.save}
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={password} type="password" minLength={6} placeholder={t.profile.newPassword} onChange={(event) => setPassword(event.target.value)} />
            <Button type="button" disabled={busy || password.length < 6} onClick={() => void savePassword()}>
              <LockKeyhole size={16} />
              {t.profile.save}
            </Button>
          </div>
        </Section>

        <Section title={t.profile.sounds} icon={<Volume2 size={16} />}>
          <SoundSettingRow icon={<Bell size={15} />} label={t.profile.notificationSound} checked={soundSettings.notifications} onChange={(notifications) => onSoundSettingsChange({ ...soundSettings, notifications })} />
          <SoundSettingRow icon={<Send size={15} />} label={t.profile.sentMessageSound} checked={soundSettings.sentMessages} onChange={(sentMessages) => onSoundSettingsChange({ ...soundSettings, sentMessages })} />
        </Section>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-borderSoft bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-secondaryText">
            <Info size={16} className="text-accent" />
            {t.profile.version}
          </div>
          <span className="text-sm font-semibold text-primaryText">{version}</span>
        </div>

        <Button type="button" variant="ghost" className="mt-4 w-full justify-start text-red-400 hover:bg-red-500/10" onClick={onLogout}>
          <LogOut size={16} />
          {t.profile.logout}
        </Button>
      </motion.div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-xl border border-borderSoft bg-background p-4 first:mt-0">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primaryText">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Choice({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className={cn("flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition", active ? "border-accent bg-accent text-white" : "border-borderSoft bg-panel text-secondaryText hover:text-primaryText")} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function PrivacyRow({ label, value, t, disabled, onChange }: { label: string; value: ProfileVisibility; t: Translation; disabled: boolean; onChange: (value: ProfileVisibility) => void | Promise<void> }) {
  return (
    <div className="flex min-h-12 items-center gap-3 border-t border-borderSoft first:border-t-0">
      <span className="min-w-0 flex-1 text-sm text-primaryText">{label}</span>
      <div className="flex rounded-lg bg-panel p-1">
        {(["everyone", "nobody"] as const).map((item) => (
          <button key={item} type="button" disabled={disabled} className={cn("h-7 rounded-md px-2.5 text-xs font-semibold transition disabled:opacity-50", value === item ? "bg-accent text-white" : "text-secondaryText hover:text-primaryText")} onClick={() => void onChange(item)}>
            {item === "everyone" ? t.profile.visibilityEveryone : t.profile.visibilityNobody}
          </button>
        ))}
      </div>
    </div>
  );
}

function SoundSettingRow({ icon, label, checked, onChange }: { icon: ReactNode; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-11 items-center gap-3 border-t border-borderSoft first:border-t-0">
      <span className="text-secondaryText">{icon}</span>
      <span className="min-w-0 flex-1 text-sm text-primaryText">{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 rounded-full border transition", checked ? "border-accent bg-accent" : "border-borderSoft bg-panel2")}>
        <span className={cn("absolute left-[3px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0")} />
      </button>
    </div>
  );
}
