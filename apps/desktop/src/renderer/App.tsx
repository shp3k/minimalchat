import { useState } from "react";
import type { UserDTO } from "@minimalchat/shared";
import { TopBar } from "@/components/TopBar";
import type { Language } from "@/lib/i18n";
import { getStoredLanguage, storeLanguage, storeUser } from "@/lib/storage";
import { getStoredUser } from "@/lib/storage";
import { AuthPage } from "@/pages/AuthPage";
import { ChatPage } from "@/pages/ChatPage";

export function App() {
  const [user, setUser] = useState<UserDTO | null>(() => getStoredUser());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  return (
    <div className="flex h-screen min-h-[600px] min-w-[900px] flex-col overflow-hidden bg-background text-primaryText">
      <TopBar />
      {user ? (
        <ChatPage
          user={user}
          language={language}
          onUserUpdate={(nextUser) => {
            storeUser(nextUser);
            setUser(nextUser);
          }}
          onLanguageChange={(nextLanguage) => {
            storeLanguage(nextLanguage);
            setLanguage(nextLanguage);
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
