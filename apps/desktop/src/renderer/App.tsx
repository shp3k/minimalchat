import { useEffect, useState } from "react";
import type { UserDTO } from "@minimalchat/shared";
import { TopBar } from "@/components/TopBar";
import { UpdateBanner } from "@/components/UpdateBanner";
import { api } from "@/lib/api";
import type { Language } from "@/lib/i18n";
import { clearStoredUser, getStoredLanguage, getStoredTheme, storeLanguage, storeTheme, storeUser, type Theme } from "@/lib/storage";
import { getStoredUser } from "@/lib/storage";
import { AuthPage } from "@/pages/AuthPage";
import { ChatPage } from "@/pages/ChatPage";

export function App() {
  const [user, setUser] = useState<UserDTO | null>(() => getStoredUser());
  const [checkingSession, setCheckingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    let cancelled = false;

    api
      .currentUser()
      .then((currentUser) => {
        if (cancelled) return;

        if (currentUser) {
          storeUser(currentUser);
          setUser(currentUser);
          return;
        }

        clearStoredUser();
        setUser(null);
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredUser();
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`${theme} flex h-screen min-h-[600px] min-w-[900px] flex-col overflow-hidden bg-background text-primaryText`}>
      <TopBar />
      <UpdateBanner language={language} />
      {checkingSession ? (
        <main className="grid flex-1 place-items-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
        </main>
      ) : user ? (
        <ChatPage
          user={user}
          language={language}
          theme={theme}
          onUserUpdate={(nextUser) => {
            storeUser(nextUser);
            setUser(nextUser);
          }}
          onLanguageChange={(nextLanguage) => {
            storeLanguage(nextLanguage);
            setLanguage(nextLanguage);
          }}
          onThemeChange={(nextTheme) => {
            storeTheme(nextTheme);
            setTheme(nextTheme);
          }}
          onLogout={() => setUser(null)}
        />
      ) : (
        <AuthPage
          mode={authMode}
          language={language}
          onLanguageChange={setLanguage}
          onModeChange={setAuthMode}
          onAuthenticated={setUser}
        />
      )}
    </div>
  );
}
