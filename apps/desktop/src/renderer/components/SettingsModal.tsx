import { Languages, LogOut, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Language, Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  t: Translation;
  language: Language;
  onClose: () => void;
  onLanguageChange: (language: Language) => void;
  onLogout: () => void;
}

export function SettingsModal({ t, language, onClose, onLanguageChange, onLogout }: SettingsModalProps) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/55 px-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="w-full max-w-[380px] rounded-[28px] border border-borderSoft bg-panel p-5 shadow-glow"
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
