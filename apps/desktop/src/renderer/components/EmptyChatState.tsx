import { MessageSquareText } from "lucide-react";
import { motion } from "motion/react";
import type { Translation } from "@/lib/i18n";

interface EmptyChatStateProps {
  t: Translation;
}

export function EmptyChatState({ t }: EmptyChatStateProps) {
  return (
    <div className="grid h-full place-items-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex max-w-sm flex-col items-center text-center"
      >
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-3xl border border-borderSoft bg-panel2 text-accent">
          <MessageSquareText size={28} />
        </div>
        <h2 className="text-xl font-semibold text-primaryText">{t.chat.selectConversation}</h2>
        <p className="mt-2 text-sm leading-6 text-secondaryText">
          {t.chat.emptyConversation}
        </p>
      </motion.div>
    </div>
  );
}
