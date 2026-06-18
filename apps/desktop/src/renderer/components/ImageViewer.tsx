import { Download, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

interface ImageViewerProps {
  url: string;
  name: string;
  closeLabel: string;
  onClose: () => void;
}

export function ImageViewer({ url, name, closeLabel, onClose }: ImageViewerProps) {
  return (
    <button
      type="button"
      className="absolute inset-0 z-50 grid place-items-center bg-black/68 px-8 py-7 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="flex max-h-[82vh] w-fit max-w-[78vw] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-panel shadow-glow"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-borderSoft px-4">
          <p className="min-w-0 truncate text-sm font-semibold text-primaryText">{name}</p>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={url}
              download={name}
              className="grid h-9 w-9 place-items-center rounded-2xl text-secondaryText transition hover:bg-white/[0.08] hover:text-primaryText"
              aria-label={name}
            >
              <Download size={17} />
            </a>
            <Button type="button" variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 place-items-center bg-black/20 p-3">
          <img
            src={url}
            alt={name}
            className="max-h-[calc(82vh-5.25rem)] max-w-[calc(78vw-1.5rem)] rounded-[20px] object-contain"
          />
        </div>
      </motion.div>
    </button>
  );
}
