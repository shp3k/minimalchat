import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { FileIcon, Mic, Paperclip, SendHorizonal, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  disabled?: boolean;
  t: Translation;
  onSend: (text: string, file?: File | null) => Promise<void> | void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function ChatInput({ disabled, t, onSend }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      stopRecordingStream();
    };
  }, []);

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
      <div className="rounded-2xl border border-borderSoft bg-panel p-2 shadow-[0_12px_34px_rgba(0,0,0,0.24)]">
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
            value={text}
            maxLength={1000}
            rows={1}
            disabled={disabled}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
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
