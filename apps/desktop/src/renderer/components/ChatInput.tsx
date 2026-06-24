import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState
} from "react";
import type { MessageDTO } from "@minimalchat/shared";
import { ClipboardPaste, FileIcon, Mic, Paperclip, SendHorizonal, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  disabled?: boolean;
  t: Translation;
  replyTo?: MessageDTO | null;
  replyToAuthorName?: string;
  onCancelReply?: () => void;
  onSend: (text: string, file?: File | null) => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TYPING_IDLE_MS = 2200;
const TYPING_HEARTBEAT_MS = 1000;

export function ChatInput({ disabled, t, replyTo, replyToAuthorName, onCancelReply, onSend, onTypingChange }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [pasteMenu, setPasteMenu] = useState<{ x: number; y: number; canPaste: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const typingIdleTimerRef = useRef<number | null>(null);
  const typingHeartbeatTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopTyping();
      stopRecordingTimer();
      stopRecordingStream();
    };
  }, [onTypingChange]);

  useEffect(() => {
    if (!pasteMenu) return;

    const close = () => setPasteMenu(null);
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [pasteMenu]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = text.trim();

    if ((!value && !file) || value.length > 1000 || sending || disabled || fileError) return;

    setSending(true);
    try {
      await onSend(value, file);
      setText("");
      setFile(null);
      setFileError("");
      stopTyping();
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError(t.chat.fileTooLarge);
      return;
    }

    setFile(selected);
    setFileError("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setText(value);

    if (disabled) return;

    if (value.trim()) {
      startTyping();
      scheduleTypingStop();
      return;
    }

    stopTyping();
  }

  function startTyping() {
    if (typingActiveRef.current) return;

    typingActiveRef.current = true;
    onTypingChange?.(true);
    typingHeartbeatTimerRef.current = window.setInterval(() => {
      onTypingChange?.(true);
    }, TYPING_HEARTBEAT_MS);
  }

  function stopTyping() {
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = null;
    }
    if (typingHeartbeatTimerRef.current) {
      window.clearInterval(typingHeartbeatTimerRef.current);
      typingHeartbeatTimerRef.current = null;
    }

    if (!typingActiveRef.current) return;

    typingActiveRef.current = false;
    onTypingChange?.(false);
  }

  function scheduleTypingStop() {
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current);
    }

    typingIdleTimerRef.current = window.setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_MS);
  }

  async function openPasteMenu(event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();

    const rect = inputBoxRef.current?.getBoundingClientRect();
    const clipboard = await readClipboardContent();
    const rawX = rect ? event.clientX - rect.left : 16;
    const rawY = rect ? event.clientY - rect.top : 16;

    setPasteMenu({
      x: Math.min(Math.max(rawX, 8), Math.max(8, (rect?.width ?? 180) - 168)),
      y: Math.max(rawY - 46, 8),
      canPaste: Boolean(clipboard.text.trim() || clipboard.image)
    });
  }

  function pasteFromClipboard() {
    void pasteFromClipboardAsync();
  }

  async function pasteFromClipboardAsync() {
    const clipboard = await readClipboardContent();

    if (clipboard.image) {
      attachClipboardImage(clipboard.image);
      setPasteMenu(null);
      return;
    }

    const value = clipboard.text;
    if (!value) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${value}${text.slice(end)}`.slice(0, 1000);
    const nextCursor = Math.min(start + value.length, nextText.length);

    setText(nextText);
    setPasteMenu(null);
    if (nextText.trim()) {
      startTyping();
      scheduleTypingStop();
    }
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const image = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));

    if (!image) return;

    event.preventDefault();
    attachClipboardImage(image);
  }

  function attachClipboardImage(image: File) {
    if (image.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError(t.chat.fileTooLarge);
      return;
    }

    const extension = getImageExtension(image.type);
    const fileName = image.name && image.name !== "image.png"
      ? image.name
      : `clipboard-image-${Date.now()}.${extension}`;
    const clipboardFile = new File([image], fileName, {
      type: image.type || "image/png",
      lastModified: Date.now()
    });

    setFile(clipboardFile);
    setFileError("");
    stopTyping();
  }

  async function startRecording() {
    if (disabled || sending || recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      setFile(null);
      setFileError("");
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch {
      setFileError(t.chat.microphoneUnavailable);
    }
  }

  async function cancelRecording() {
    await stopRecording(false);
  }

  async function sendRecording() {
    const voiceFile = await stopRecording(true);
    if (!voiceFile) return;

    setSending(true);
    try {
      await onSend("", voiceFile);
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  }

  function stopRecording(shouldCreateFile: true): Promise<File | null>;
  function stopRecording(shouldCreateFile: false): Promise<null>;
  function stopRecording(shouldCreateFile: boolean) {
    return new Promise<File | null>((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        stopRecordingTimer();
        stopRecordingStream();
        setRecording(false);
        setRecordingSeconds(0);

        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (!shouldCreateFile || blob.size === 0) {
          resolve(null);
          return;
        }

        resolve(new File([blob], `voice-message-${Date.now()}.${extension}`, { type: mimeType }));
      };

      if (recorder.state !== "inactive") {
        recorder.stop();
      } else {
        recorder.onstop(new Event("stop"));
      }
    });
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }

  if (recording) {
    return (
      <div className="border-t border-borderSoft bg-background/70 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-panel px-3 py-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.24)]">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-red-500/15 text-red-300">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primaryText">{t.chat.recordingVoice}</p>
            <p className="mt-0.5 font-mono text-xs text-secondaryText">{formatDuration(recordingSeconds)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={t.chat.cancelVoice} onClick={cancelRecording}>
            <Trash2 size={18} />
          </Button>
          <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}>
            <Button type="button" size="icon" aria-label={t.chat.sendVoice} onClick={sendRecording} disabled={sending}>
              <SendHorizonal size={18} />
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-t border-borderSoft bg-background/70 p-4">
      <div
        ref={inputBoxRef}
        className="relative rounded-2xl border border-borderSoft bg-panel p-2 shadow-[0_12px_34px_rgba(0,0,0,0.24)]"
        onContextMenu={openPasteMenu}
      >
        <AnimatePresence>
          {pasteMenu ? (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-40 w-40 overflow-hidden rounded-2xl border border-borderSoft bg-panel/95 p-1 text-primaryText shadow-glow backdrop-blur"
              style={{
                left: pasteMenu.x,
                top: pasteMenu.y
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                disabled={!pasteMenu.canPaste || disabled}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:text-secondaryText/45 enabled:hover:bg-white/[0.07]"
                onClick={pasteFromClipboard}
              >
                <ClipboardPaste size={15} />
                {t.chat.pasteMessage}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {replyTo ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5"
            >
              <div className="h-9 w-1 shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-accent">
                  {t.chat.replyingTo} {replyToAuthorName || t.chat.originalMessage}
                </p>
                <p className="mt-0.5 truncate text-sm text-secondaryText">{getMessagePreview(replyTo, t)}</p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-secondaryText transition hover:bg-white/[0.08] hover:text-primaryText"
                aria-label={t.chat.cancelEdit}
                onClick={onCancelReply}
              >
                <X size={16} />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {file ? (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-background px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm text-primaryText">
              <FileIcon size={16} className="shrink-0 text-accent" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-secondaryText">{formatFileSize(file.size)}</span>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-secondaryText transition hover:bg-white/[0.08] hover:text-primaryText"
              aria-label={t.chat.removeFile}
              onClick={() => {
                setFile(null);
                setFileError("");
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        {fileError ? <p className="mb-2 px-3 text-xs text-red-300">{fileError}</p> : null}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || sending}
            aria-label={t.chat.attachFile}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </Button>
          <Textarea
            ref={textareaRef}
            value={text}
            maxLength={1000}
            rows={1}
            disabled={disabled}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={disabled ? t.chat.connecting : t.chat.writeMessage}
            className="max-h-32 min-h-[44px] border-0 bg-transparent py-2.5 focus:ring-0"
          />
          <div className="flex items-center gap-1 pr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || sending || Boolean(file)}
              aria-label={t.chat.recordVoice}
              onClick={startRecording}
            >
              <Mic size={18} />
            </Button>
            <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}>
              <Button
                type="submit"
                size="icon"
                disabled={(!text.trim() && !file) || sending || disabled || text.length > 1000 || Boolean(fileError)}
                aria-label="Send message"
                className={cn(file ? "shadow-accent" : undefined)}
              >
                <SendHorizonal size={18} />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </form>
  );
}

async function readClipboardContent() {
  if (window.minimalChatClipboard) {
    const [textResult, imageResult] = await Promise.allSettled([
      window.minimalChatClipboard.readText(),
      window.minimalChatClipboard.readImage?.() ?? Promise.resolve({ ok: false })
    ]);
    const text = textResult.status === "fulfilled" ? textResult.value : "";
    const image = imageResult.status === "fulfilled" ? imageResult.value : { ok: false };

    return {
      text,
      image: image.ok && image.dataUrl ? await dataUrlToImageFile(image.dataUrl).catch(() => null) : null
    };
  }

  try {
    return {
      text: await navigator.clipboard.readText(),
      image: null
    };
  } catch {
    return { text: "", image: null };
  }
}

async function dataUrlToImageFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = getImageExtension(blob.type);

  return new File([blob], `clipboard-image-${Date.now()}.${extension}`, {
    type: blob.type || "image/png",
    lastModified: Date.now()
  });
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "png";
}

function getMessagePreview(message: MessageDTO, t: Translation) {
  return message.text.trim() || message.attachmentName || t.chat.originalMessage;
}

function getRecorderMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
