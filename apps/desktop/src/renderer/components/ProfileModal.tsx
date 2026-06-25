import { ChangeEvent, FormEvent, PointerEvent, useRef, useState } from "react";
import type { UserDTO } from "@minimalchat/shared";
import { AtSign, Camera, Copy, QrCode, Settings, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  user: UserDTO;
  t: Translation;
  loading: boolean;
  error: string;
  onClose: () => void;
  onOpenSettings: () => void;
  onSave: (data: { username: string; handle: string; avatarUrl: string | null; bio: string }) => Promise<void>;
}

export function ProfileModal({ user, t, loading, error, onClose, onOpenSettings, onSave }: ProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(user.username);
  const [handle, setHandle] = useState(user.handle ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [avatarError, setAvatarError] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [cropImageSize, setCropImageSize] = useState({ width: 1, height: 1 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const normalizedHandle = handle.replace(/^@+/, "").toLowerCase();
  const canSave =
    username.trim().length >= 2 &&
    /^[a-z0-9_]{3,24}$/.test(normalizedHandle) &&
    !avatarError &&
    !cropSource &&
    !loading;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    await onSave({ username: username.trim(), handle: normalizedHandle, avatarUrl, bio: bio.trim() });
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type) || file.size > 1_000_000) {
      setAvatarError(t.errors.invalidAvatar);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setCropSource(value);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setAvatarError("");
    };
    reader.onerror = () => setAvatarError(t.errors.invalidAvatar);
    reader.readAsDataURL(file);
  }

  function clampOffset(offset: { x: number; y: number }, zoom = cropZoom) {
    const baseScale = getBaseScale(cropImageSize);
    const displayWidth = cropImageSize.width * baseScale * zoom;
    const displayHeight = cropImageSize.height * baseScale * zoom;
    const maxX = Math.max(0, (displayWidth - CROP_BOX_SIZE) / 2);
    const maxY = Math.max(0, (displayHeight - CROP_BOX_SIZE) / 2);

    return {
      x: clamp(offset.x, -maxX, maxX),
      y: clamp(offset.y, -maxY, maxY)
    };
  }

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropOffset.x,
      originY: cropOffset.y
    });
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setCropOffset(
      clampOffset({
        x: dragStart.originX + event.clientX - dragStart.startX,
        y: dragStart.originY + event.clientY - dragStart.startY
      })
    );
  }

  function handleCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  }

  function handleZoomChange(value: number) {
    setCropZoom(value);
    setCropOffset((current) => clampOffset(current, value));
  }

  async function applyCrop() {
    if (!cropSource) return;

    try {
      const croppedAvatar = await cropAvatar(cropSource, cropImageSize, cropZoom, cropOffset);
      setAvatarUrl(croppedAvatar);
      setCropSource("");
      setAvatarError("");
    } catch {
      setAvatarError(t.errors.invalidAvatar);
    }
  }

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/50 px-6 backdrop-blur-sm">
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onSubmit={submit}
        className="max-h-[calc(100%-32px)] w-full max-w-[420px] overflow-y-auto rounded-[28px] border border-borderSoft bg-panel p-6 shadow-glow"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar username={username || user.username} avatarUrl={avatarUrl} online className="h-14 w-14 rounded-full" />
            <div>
              <h2 className="text-xl font-semibold text-primaryText">{t.profile.title}</h2>
              <p className="mt-1 text-sm text-secondaryText">@{user.handle ?? user.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
            >
              <Settings size={16} />
              {t.profile.settings}
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={t.profile.close} onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {user.handle ? (
            <div className="rounded-2xl border border-borderSoft bg-background p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-primaryText"
                onClick={() => setQrOpen((current) => !current)}
              >
                <span className="flex items-center gap-2">
                  <QrCode size={17} className="text-accent" />
                  {t.profile.profileQr}
                </span>
                <span className="truncate text-xs text-secondaryText">@{user.handle}</span>
              </button>
              <AnimatePresence>
                {qrOpen ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex flex-col items-center">
                      <div className="rounded-2xl bg-white p-4">
                        <QRCodeSVG value={`minimalchat://user/@${user.handle}`} size={176} level="M" />
                      </div>
                      <p className="mt-3 text-center text-xs leading-5 text-secondaryText">{t.profile.qrHelp}</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
          <div className="rounded-3xl border border-borderSoft bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-secondaryText">{t.profile.avatar}</span>
              <span className="text-right text-xs text-secondaryText">{t.profile.avatarHelp}</span>
            </div>
            <div className="flex items-center gap-4">
              <Avatar username={username || user.username} avatarUrl={avatarUrl} online className="h-20 w-20 rounded-full" />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={16} />
                  {t.profile.changeAvatar}
                </Button>
                {avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarUrl(null);
                      setAvatarError("");
                    }}
                  >
                    <Trash2 size={16} />
                    {t.profile.removeAvatar}
                  </Button>
                ) : null}
              </div>
            </div>
            {avatarError ? <p className="mt-3 text-xs text-red-300">{avatarError}</p> : null}
            {cropSource ? (
              <div className="mt-4 rounded-3xl border border-borderSoft bg-panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-secondaryText">{t.profile.cropAvatar}</span>
                  <span className="text-xs text-secondaryText">{t.profile.zoom}</span>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="relative h-[220px] w-[220px] touch-none overflow-hidden rounded-[32px] border border-accent/40 bg-background shadow-accent"
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                  >
                    <img
                      src={cropSource}
                      alt=""
                      draggable={false}
                      onLoad={(event) => {
                        setCropImageSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight
                        });
                        setCropOffset({ x: 0, y: 0 });
                      }}
                      className="absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        width: `${cropImageSize.width * getBaseScale(cropImageSize) * cropZoom}px`,
                        height: `${cropImageSize.height * getBaseScale(cropImageSize) * cropZoom}px`,
                        transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-2 ring-white/80 ring-offset-0" />
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={cropZoom}
                    onChange={(event) => handleZoomChange(Number(event.target.value))}
                    className="w-full accent-[#7C3AED]"
                  />
                  <div className="flex w-full gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={applyCrop}>
                      {t.profile.applyCrop}
                    </Button>
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setCropSource("")}>
                      {t.profile.cancelCrop}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-secondaryText">{t.profile.publicId}</span>
            <div className="flex h-12 items-center justify-between gap-3 rounded-2xl border border-borderSoft bg-background px-4 text-sm text-secondaryText">
              <span className="truncate font-mono">@{user.id}</span>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1 transition hover:bg-white/[0.08] hover:text-primaryText"
                onClick={() => void navigator.clipboard.writeText(`@${user.id}`)}
              >
                <Copy size={15} />
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-secondaryText">{t.profile.bio}</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={160}
              rows={3}
              placeholder={t.profile.bioPlaceholder}
              className="min-h-24 w-full resize-none rounded-2xl border border-borderSoft bg-background px-4 py-3 text-sm leading-5 text-primaryText outline-none transition placeholder:text-secondaryText focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
            />
            <p className="mt-1.5 text-right text-[11px] text-secondaryText">{bio.length}/160</p>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-secondaryText">{t.profile.username}</span>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={32} />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-secondaryText">{t.profile.handle}</span>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondaryText" size={16} />
              <Input
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="minimal_user"
                className="pl-11"
                maxLength={25}
              />
            </div>
            <p className={cn("mt-2 text-xs", canSave || loading ? "text-secondaryText" : "text-red-300")}>
              {t.profile.handleHelp}
            </p>
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </div>

        <Button className="mt-6 w-full" disabled={!canSave}>
          {loading ? t.profile.saving : t.profile.save}
        </Button>
      </motion.form>
    </div>
  );
}

const CROP_BOX_SIZE = 220;
const AVATAR_OUTPUT_SIZE = 512;

function getBaseScale(size: { width: number; height: number }) {
  return Math.max(CROP_BOX_SIZE / size.width, CROP_BOX_SIZE / size.height);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cropAvatar(
  source: string,
  size: { width: number; height: number },
  zoom: number,
  offset: { x: number; y: number }
) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas is unavailable"));
        return;
      }

      canvas.width = AVATAR_OUTPUT_SIZE;
      canvas.height = AVATAR_OUTPUT_SIZE;

      const scale = getBaseScale(size) * zoom;
      const sourceSize = CROP_BOX_SIZE / scale;
      const sourceX = size.width / 2 - (CROP_BOX_SIZE / 2 + offset.x) / scale;
      const sourceY = size.height / 2 - (CROP_BOX_SIZE / 2 + offset.y) / scale;

      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        clamp(sourceX, 0, size.width - sourceSize),
        clamp(sourceY, 0, size.height - sourceSize),
        sourceSize,
        sourceSize,
        0,
        0,
        AVATAR_OUTPUT_SIZE,
        AVATAR_OUTPUT_SIZE
      );

      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    image.onerror = reject;
    image.src = source;
  });
}
