import { useEffect, useMemo, useState } from "react";
import { DownloadCloud, RefreshCw, RotateCw, X } from "lucide-react";
import { motion } from "motion/react";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type UpdateStatus =
  | { state: "checking" }
  | { state: "available"; version?: string }
  | { state: "not-available" }
  | { state: "downloading"; percent?: number; transferred?: number; total?: number }
  | { state: "downloaded"; version?: string }
  | { state: "error"; message?: string };

interface UpdateBannerProps {
  language: Language;
}

const copy = {
  ru: {
    checking: "Проверяю обновления",
    available: "Найдена новая версия",
    downloading: "Скачиваю обновление",
    downloadingHint: "Можно продолжать пользоваться приложением.",
    downloaded: "Обновление готово",
    downloadedHint: "Перезапустите MinimalChat, чтобы установить новую версию.",
    error: "Не удалось обновиться",
    restart: "Перезапустить",
    later: "Позже",
    check: "Проверить обновления"
  },
  en: {
    checking: "Checking for updates",
    available: "New version found",
    downloading: "Downloading update",
    downloadingHint: "You can keep using the app.",
    downloaded: "Update is ready",
    downloadedHint: "Restart MinimalChat to install the new version.",
    error: "Could not update",
    restart: "Restart",
    later: "Later",
    check: "Check updates"
  }
} as const;

export function UpdateBanner({ language }: UpdateBannerProps) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissedState, setDismissedState] = useState<string | null>(null);
  const text = copy[language];

  useEffect(() => {
    return window.minimalChatUpdates?.onStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus.state !== "not-available") {
        setDismissedState(null);
      }
    });
  }, []);

  const visible = useMemo(() => {
    if (!status) return false;
    if (status.state === "not-available") return false;
    if (status.state === dismissedState) return false;
    return true;
  }, [dismissedState, status]);

  if (!visible || !status) return null;

  const percent = status.state === "downloading" ? Math.max(0, Math.min(100, status.percent ?? 0)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      className="pointer-events-none fixed right-5 top-16 z-[80] w-[360px] max-w-[calc(100vw-40px)]"
    >
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-borderSoft bg-panel/95 shadow-glow backdrop-blur">
        <div className="flex items-start gap-3 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/16 text-accent">
            {status.state === "downloading" ? (
              <DownloadCloud size={19} />
            ) : status.state === "downloaded" ? (
              <RotateCw size={19} />
            ) : (
              <RefreshCw size={19} className={cn(status.state === "checking" ? "animate-spin" : "")} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primaryText">{getTitle(status, text)}</p>
            <p className="mt-1 text-xs leading-5 text-secondaryText">{getSubtitle(status, text)}</p>
            {status.state === "downloading" ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
              </div>
            ) : null}
            {status.state === "downloaded" ? (
              <button
                type="button"
                className="mt-3 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-accent transition hover:bg-accent2"
                onClick={() => void window.minimalChatUpdates?.install()}
              >
                {text.restart}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-secondaryText transition hover:bg-white/[0.06] hover:text-primaryText"
            aria-label={text.later}
            onClick={() => setDismissedState(status.state)}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function getTitle(status: UpdateStatus, text: (typeof copy)[Language]) {
  if (status.state === "checking") return text.checking;
  if (status.state === "available") return status.version ? `${text.available} ${status.version}` : text.available;
  if (status.state === "downloading") return `${text.downloading} ${status.percent ?? 0}%`;
  if (status.state === "downloaded") return status.version ? `${text.downloaded} ${status.version}` : text.downloaded;
  return text.error;
}

function getSubtitle(status: UpdateStatus, text: (typeof copy)[Language]) {
  if (status.state === "downloaded") return text.downloadedHint;
  if (status.state === "error") return status.message ?? text.error;
  if (status.state === "downloading") return text.downloadingHint;
  return text.check;
}
