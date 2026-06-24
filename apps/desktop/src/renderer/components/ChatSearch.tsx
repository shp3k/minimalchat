import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import type { Translation } from "@/lib/i18n";

interface ChatSearchProps {
  open: boolean;
  query: string;
  resultCount: number;
  activeResult: number;
  t: Translation;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function ChatSearch({
  open,
  query,
  resultCount,
  activeResult,
  t,
  onOpenChange,
  onQueryChange,
  onPrevious,
  onNext
}: ChatSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <div className="flex items-center">
      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.button
            key="search-button"
            type="button"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            aria-label={t.chat.searchMessages}
            title={t.chat.searchMessages}
            className="grid h-10 w-10 place-items-center rounded-xl text-secondaryText transition hover:bg-white/[0.06] hover:text-primaryText"
            onClick={() => onOpenChange(true)}
          >
            <Search size={18} />
          </motion.button>
        ) : (
          <motion.div
            key="search-input"
            initial={{ opacity: 0, width: 44 }}
            animate={{ opacity: 1, width: 330 }}
            exit={{ opacity: 0, width: 44 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-10 items-center overflow-hidden rounded-xl border border-borderSoft bg-panel2"
          >
            <Search size={16} className="ml-3 shrink-0 text-secondaryText" />
            <input
              ref={inputRef}
              value={query}
              placeholder={t.chat.searchMessages}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-sm text-primaryText outline-none placeholder:text-secondaryText"
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenChange(false);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  event.shiftKey ? onPrevious() : onNext();
                }
              }}
            />
            <span className="shrink-0 px-1 text-xs tabular-nums text-secondaryText">
              {query.trim() ? `${resultCount ? activeResult + 1 : 0}/${resultCount}` : ""}
            </span>
            <SearchButton label={t.chat.previousResult} disabled={!resultCount} onClick={onPrevious}>
              <ChevronUp size={16} />
            </SearchButton>
            <SearchButton label={t.chat.nextResult} disabled={!resultCount} onClick={onNext}>
              <ChevronDown size={16} />
            </SearchButton>
            <SearchButton label={t.chat.closeSearch} onClick={() => onOpenChange(false)}>
              <X size={16} />
            </SearchButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchButton({
  children,
  label,
  disabled,
  onClick
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="grid h-9 w-8 shrink-0 place-items-center text-secondaryText transition hover:bg-white/[0.06] hover:text-primaryText disabled:cursor-not-allowed disabled:opacity-30"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
