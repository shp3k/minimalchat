import { FormEvent, useState } from "react";
import type { UserDTO } from "@minimalchat/shared";
import { motion } from "motion/react";
import { Check, ChevronDown, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Language } from "@/lib/i18n";
import { getTranslation, translateError } from "@/lib/i18n";
import { storeLanguage, storeUser } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface AuthPageProps {
  mode: "login" | "register";
  language: Language;
  onLanguageChange: (language: Language) => void;
  onModeChange: (mode: "login" | "register") => void;
  onAuthenticated: (user: UserDTO) => void;
}

export function AuthPage({ mode, language, onLanguageChange, onModeChange, onAuthenticated }: AuthPageProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const t = getTranslation(language);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result =
        mode === "register"
          ? await api.register({ username, email, password })
          : await api.login({ email, password });
      storeUser(result.user);
      onAuthenticated(result.user);
    } catch (caught) {
      setError(translateError(caught, t));
    } finally {
      setLoading(false);
    }
  }

  function changeLanguage(nextLanguage: Language) {
    storeLanguage(nextLanguage);
    onLanguageChange(nextLanguage);
    setLanguageMenuOpen(false);
  }

  const isRegister = mode === "register";
  const selectedLanguage = languageOptions[language];

  return (
    <main className="relative grid flex-1 place-items-center overflow-hidden bg-background px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.20),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.12),transparent_28%)]" />
      <div className="absolute bottom-6 left-6 z-10">
        {languageMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-2 w-44 overflow-hidden rounded-2xl border border-borderSoft bg-panel/95 p-1 shadow-glow backdrop-blur"
          >
            {(["en", "ru"] as const).map((item) => {
              const option = languageOptions[item];

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeLanguage(item)}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm transition",
                    language === item
                      ? "bg-accent/18 text-primaryText"
                      : "text-secondaryText hover:bg-white/[0.06] hover:text-primaryText"
                  )}
                >
                  <span className="font-semibold">{option.code}</span>
                  {language === item ? <Check size={15} className="text-accent" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}

        <button
          type="button"
          onClick={() => setLanguageMenuOpen((value) => !value)}
          className="flex h-11 items-center gap-2 rounded-2xl border border-borderSoft bg-panel/90 px-4 text-sm text-primaryText shadow-glow backdrop-blur transition hover:bg-panel2"
        >
          <span className="font-semibold">{selectedLanguage.code}</span>
          <ChevronDown
            size={16}
            className={cn("text-secondaryText transition", languageMenuOpen ? "rotate-180" : "rotate-0")}
          />
        </button>
      </div>
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        className="glass-panel relative w-full max-w-[430px] rounded-[28px] p-7"
      >
        <div className="mb-7 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-accent text-white shadow-accent">
            <MessageCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-primaryText">
              {isRegister ? t.auth.createAccount : t.auth.welcomeBack}
            </h1>
            <p className="mt-1 text-sm text-secondaryText">{t.auth.subtitle}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {isRegister ? (
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t.auth.username}
              autoComplete="username"
              required
              minLength={2}
              maxLength={32}
            />
          ) : null}
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.auth.email}
            type="email"
            autoComplete="email"
            required
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t.auth.password}
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 6 : 1}
          />

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </motion.div>
          ) : null}

          <Button className="w-full" disabled={loading}>
            {loading ? t.auth.pleaseWait : isRegister ? t.auth.createAccount : t.auth.signIn}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-borderSoft bg-panel2 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-secondaryText">
            <ShieldCheck size={15} className="text-accent" />
            {t.auth.passwordHash}
          </div>
          <button
            type="button"
            className="text-sm font-medium text-primaryText transition hover:text-accent"
            onClick={() => {
              setError("");
              onModeChange(isRegister ? "login" : "register");
            }}
          >
            {isRegister ? t.auth.signIn : t.auth.register}
          </button>
        </div>
      </motion.section>
    </main>
  );
}

const languageOptions: Record<Language, { code: string }> = {
  en: {
    code: "EN"
  },
  ru: {
    code: "RU"
  }
};
