import type { SpaceType, UserListItemDTO } from "@minimalchat/shared";
import { Camera, Check, Radio, Users, X } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Translation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CreateSpaceModalProps {
  type: SpaceType;
  contacts: UserListItemDTO[];
  t: Translation;
  busy: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    handle: string;
    avatarUrl: string | null;
    description: string;
    commentsEnabled: boolean;
    memberIds: string[];
  }) => Promise<void>;
}

export function CreateSpaceModal({ type, contacts, t, busy, onClose, onCreate }: CreateSpaceModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2 || busy) return;
    await onCreate({ title: title.trim(), handle, avatarUrl, description, commentsEnabled, memberIds });
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 px-6 backdrop-blur-sm">
      <motion.form
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onSubmit={submit}
        className="max-h-[calc(100%-32px)] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-borderSoft bg-panel p-5 shadow-glow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
              {type === "group" ? <Users size={20} /> : <Radio size={20} />}
            </div>
            <h2 className="text-lg font-semibold text-primaryText">{type === "group" ? t.chat.createGroup : t.chat.createChannel}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button type="button" className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-borderSoft bg-background text-secondaryText" onClick={() => fileRef.current?.click()}>
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <Camera size={22} />}
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <Input value={title} maxLength={48} placeholder={type === "group" ? t.chat.groupName : t.chat.channelName} onChange={(event) => setTitle(event.target.value)} />
            {type === "channel" ? <Input value={handle} maxLength={24} placeholder={t.chat.channelHandle} onChange={(event) => setHandle(event.target.value.replace(/[^a-zA-Z0-9_@]/g, ""))} /> : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={selectAvatar} />
        </div>

        {type === "channel" ? (
          <>
            <textarea value={description} maxLength={240} rows={3} placeholder={t.chat.channelDescription} onChange={(event) => setDescription(event.target.value)} className="mt-3 w-full resize-none rounded-xl border border-borderSoft bg-background px-3 py-2 text-sm text-primaryText outline-none focus:border-accent" />
            <label className="mt-3 flex items-center gap-3 rounded-xl border border-borderSoft bg-background px-3 py-3 text-sm text-primaryText">
              <input type="checkbox" checked={commentsEnabled} onChange={(event) => setCommentsEnabled(event.target.checked)} className="accent-violet-600" />
              {t.chat.enableComments}
            </label>
          </>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-secondaryText">{t.chat.participants}</p>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-borderSoft bg-background p-2">
            {contacts.length ? contacts.map((contact) => {
              const selected = memberIds.includes(contact.id);
              return (
                <button key={contact.id} type="button" className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition", selected ? "bg-accent/15" : "hover:bg-panel2")} onClick={() => setMemberIds((current) => selected ? current.filter((id) => id !== contact.id) : [...current, contact.id])}>
                  <Avatar username={contact.username} avatarUrl={contact.avatarUrl} className="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-primaryText">{contact.username}</span>
                    <span className="block truncate text-xs text-secondaryText">@{contact.handle}</span>
                  </span>
                  {selected ? <Check size={17} className="text-accent" /> : null}
                </button>
              );
            }) : <p className="px-3 py-8 text-center text-sm text-secondaryText">{t.chat.noContacts}</p>}
          </div>
        </div>

        <Button type="submit" className="mt-4 w-full" disabled={busy || title.trim().length < 2}>
          {type === "group" ? t.chat.createGroup : t.chat.createChannel}
        </Button>
      </motion.form>
    </div>
  );
}
