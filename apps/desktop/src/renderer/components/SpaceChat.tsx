import type { SpaceDTO, SpaceMemberDTO, SpaceMessageDTO, UserDTO, UserListItemDTO } from "@minimalchat/shared";
import { Camera, Crown, Plus, Radio, Send, Shield, Trash2, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Translation } from "@/lib/i18n";
import { cn, formatMessageTime } from "@/lib/utils";

interface SpaceChatProps {
  space: SpaceDTO;
  currentUser: UserDTO;
  messages: SpaceMessageDTO[];
  members: SpaceMemberDTO[];
  contacts: UserListItemDTO[];
  loading: boolean;
  t: Translation;
  onSend: (text: string, kind: "message" | "post" | "comment", parentPostId?: string | null) => Promise<void>;
  onDelete: (message: SpaceMessageDTO) => Promise<void>;
  onUpdateSpace: (data: { title: string; avatarUrl: string | null; description: string; commentsEnabled: boolean }) => Promise<void>;
  onRoleChange: (userId: string, role: "admin" | "member") => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onAddMember: (userId: string) => Promise<void>;
  onSubscribe: () => Promise<void>;
}

export function SpaceChat({ space, currentUser, messages, members, contacts, loading, t, onSend, onDelete, onUpdateSpace, onRoleChange, onRemoveMember, onAddMember, onSubscribe }: SpaceChatProps) {
  const [text, setText] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const canManage = space.role === "owner" || space.role === "admin";
  const latestPostId = useMemo(() => [...messages].reverse().find((message) => message.kind === "post")?.id ?? null, [messages]);
  const canPublish = space.type === "group" || canManage || (space.commentsEnabled && Boolean(latestPostId));

  async function submit() {
    const value = text.trim();
    if (!value) return;
    const kind = space.type === "group" ? "message" : canManage ? "post" : "comment";
    await onSend(value, kind, kind === "comment" ? commentPostId ?? latestPostId : null);
    setText("");
    setCommentPostId(null);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex h-[82px] shrink-0 items-center justify-between border-b border-borderSoft px-7">
        <button type="button" className="flex items-center gap-3 rounded-xl p-1 text-left hover:bg-panel2" onClick={() => setInfoOpen(true)}>
          <SpaceAvatar space={space} />
          <span>
            <span className="block text-base font-semibold text-primaryText">{space.title}</span>
            <span className="mt-1 block text-xs text-secondaryText">{space.memberCount} {t.chat.participants.toLowerCase()}</span>
          </span>
        </button>
      </header>

      {!space.subscribed ? (
        <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
          <div>
            <SpaceAvatar space={space} />
            <h2 className="mt-4 text-xl font-semibold text-primaryText">{space.title}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-secondaryText">{space.description}</p>
            <Button className="mt-5" onClick={() => void onSubscribe()}>{t.chat.subscribe}</Button>
          </div>
        </div>
      ) : <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
        {loading ? <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <div key={i} className={cn("skeleton h-14 rounded-xl", i % 2 ? "ml-auto w-[45%]" : "w-[55%]")} />)}</div> : (
          <div className="space-y-3">
            {messages.map((message) => {
              const mine = message.senderId === currentUser.id;
              const mayDelete = mine || canManage;
              return (
                <motion.div key={message.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("relative max-w-[68%] rounded-2xl border px-3.5 py-2.5", mine ? "border-accent/30 bg-accent text-white" : "border-borderSoft bg-panel2 text-primaryText")}>
                    {!mine ? <p className="mb-1 text-xs font-semibold text-accent">{message.senderName}</p> : null}
                    {message.kind === "post" ? <p className="mb-1 text-[11px] font-semibold uppercase text-secondaryText">{t.chat.channels}</p> : null}
                    {message.kind === "comment" ? <p className="mb-1 text-[11px] text-secondaryText">{t.chat.comments}</p> : null}
                    <p className="whitespace-pre-wrap break-words text-sm leading-5"><MentionText text={message.text} currentHandle={currentUser.handle} /></p>
                    <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-65">
                      <span>{formatMessageTime(message.sentAt)}</span>
                      {mayDelete ? <button type="button" title={t.chat.deleteMessage} className="opacity-0 transition group-hover:opacity-100" onClick={() => void onDelete(message)}><Trash2 size={12} /></button> : null}
                    </div>
                    {space.type === "channel" && message.kind === "post" && space.commentsEnabled ? (
                      <button type="button" className="mt-2 text-xs font-semibold text-accent" onClick={() => setCommentPostId(message.id)}>{t.chat.comments}</button>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>}

      {space.subscribed ? <div className="border-t border-borderSoft p-5">
        {commentPostId ? <div className="mb-2 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-xs text-secondaryText"><span>{t.chat.writeComment}</span><button onClick={() => setCommentPostId(null)}><X size={14} /></button></div> : null}
        {canPublish ? (
          <div className="flex items-end gap-2 rounded-2xl border border-borderSoft bg-panel px-3 py-2">
            <textarea value={text} maxLength={1000} rows={1} placeholder={space.type === "channel" && canManage ? t.chat.publishPost : space.type === "channel" ? t.chat.writeComment : t.chat.writeMessage} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-primaryText outline-none" />
            <Button type="button" size="icon" disabled={!text.trim()} onClick={() => void submit()}><Send size={17} /></Button>
          </div>
        ) : <p className="text-center text-sm text-secondaryText">{t.chat.channels}</p>}
      </div> : null}

      <AnimatePresence>
        {infoOpen ? <SpaceInfo space={space} members={members} contacts={contacts} t={t} canManage={canManage} onClose={() => setInfoOpen(false)} onUpdateSpace={onUpdateSpace} onRoleChange={onRoleChange} onRemoveMember={onRemoveMember} onAddMember={onAddMember} /> : null}
      </AnimatePresence>
    </section>
  );
}

function SpaceAvatar({ space }: { space: SpaceDTO }) {
  return space.avatarUrl ? <img src={space.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white">{space.type === "group" ? <Users size={20} /> : <Radio size={20} />}</div>;
}

function MentionText({ text, currentHandle }: { text: string; currentHandle: string | null }) {
  return text.split(/(@[a-z0-9_]{3,24})/gi).map((part, index) => part.startsWith("@") ? <span key={index} className={cn("rounded px-0.5 font-semibold text-violet-300", currentHandle && part.toLowerCase() === `@${currentHandle.toLowerCase()}` && "bg-yellow-300 text-zinc-950")}>{part}</span> : part);
}

function SpaceInfo({ space, members, contacts, t, canManage, onClose, onUpdateSpace, onRoleChange, onRemoveMember, onAddMember }: { space: SpaceDTO; members: SpaceMemberDTO[]; contacts: UserListItemDTO[]; t: Translation; canManage: boolean; onClose: () => void; onUpdateSpace: SpaceChatProps["onUpdateSpace"]; onRoleChange: SpaceChatProps["onRoleChange"]; onRemoveMember: SpaceChatProps["onRemoveMember"]; onAddMember: SpaceChatProps["onAddMember"] }) {
  const [title, setTitle] = useState(space.title);
  const [avatarUrl, setAvatarUrl] = useState(space.avatarUrl);
  const [description, setDescription] = useState(space.description);
  const [commentsEnabled, setCommentsEnabled] = useState(space.commentsEnabled);
  const existingIds = new Set(members.map((item) => item.userId));
  const available = contacts.filter((item) => !existingIds.has(item.id));

  function selectAvatar(file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || file.size > 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-borderSoft bg-panel p-5 shadow-glow">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-primaryText">{space.title}</h2><Button variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button></div>
        {canManage ? <div className="mt-4 space-y-2"><div className="flex items-center gap-2"><label className="relative grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-borderSoft bg-background text-secondaryText">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <Camera size={17} />}<input type="file" accept="image/*" hidden onChange={(event) => selectAvatar(event.target.files?.[0])} /></label><input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 flex-1 rounded-lg border border-borderSoft bg-background px-3 text-sm text-primaryText outline-none" /><Button onClick={() => void onUpdateSpace({ title: title.trim(), avatarUrl, description, commentsEnabled })}>{t.profile.save}</Button></div>{space.type === "channel" ? <><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-borderSoft bg-background px-3 py-2 text-sm text-primaryText outline-none" placeholder={t.chat.channelDescription} /><label className="flex items-center gap-2 text-sm text-primaryText"><input type="checkbox" checked={commentsEnabled} onChange={(event) => setCommentsEnabled(event.target.checked)} className="accent-violet-600" />{t.chat.enableComments}</label></> : null}</div> : null}
        <p className="mb-2 mt-5 text-xs font-semibold uppercase text-secondaryText">{t.chat.participants}</p>
        <div className="space-y-1">
          {members.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-background"><Avatar username={member.user.username} avatarUrl={member.user.avatarUrl} className="h-9 w-9" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-primaryText">{member.user.username}</p><p className="text-xs text-secondaryText">@{member.user.handle}</p></div><RoleIcon role={member.role} />{space.role === "owner" && member.role !== "owner" ? <button className="text-xs text-accent" onClick={() => void onRoleChange(member.userId, member.role === "admin" ? "member" : "admin")}>{member.role === "admin" ? t.chat.removeAdmin : t.chat.makeAdmin}</button> : null}{canManage && member.role === "member" ? <button className="text-red-400" onClick={() => void onRemoveMember(member.userId)}><Trash2 size={15} /></button> : null}</div>)}
        </div>
        {canManage && available.length ? (
          <>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase text-secondaryText">{t.chat.addParticipant}</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {available.map((contact) => <button key={contact.id} type="button" className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-background" onClick={() => void onAddMember(contact.id)}><Avatar username={contact.username} avatarUrl={contact.avatarUrl} className="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-sm text-primaryText">{contact.username}</span><Plus size={15} className="text-accent" /></button>)}
            </div>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}

function RoleIcon({ role }: { role: SpaceMemberDTO["role"] }) {
  if (role === "owner") return <Crown size={15} className="text-yellow-400" />;
  if (role === "admin") return <Shield size={15} className="text-accent" />;
  return null;
}
