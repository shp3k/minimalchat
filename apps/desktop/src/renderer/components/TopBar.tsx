import { Maximize2, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  return (
    <div className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-borderSoft bg-background/95 px-3">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-primaryText">
        <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_24px_rgba(124,58,237,0.8)]" />
        MinimalChat
      </div>
      <div className="no-drag flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Minimize" onClick={() => window.minimalChatWindow?.minimize()}>
          <Minus size={15} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Maximize" onClick={() => window.minimalChatWindow?.maximize()}>
          <Maximize2 size={14} />
        </Button>
        <Button variant="danger" size="icon" aria-label="Close" onClick={() => window.minimalChatWindow?.close()}>
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
