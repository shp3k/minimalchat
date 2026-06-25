import type {
  AuthResponseDTO,
  LoginDTO,
  MessageDTO,
  MessageReactionDTO,
  PrivacySettingsDTO,
  RegisterDTO,
  SendMessageDTO,
  UpdateProfileDTO,
  UserDTO,
  UserListItemDTO
} from "@minimalchat/shared";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "minimalchat-uploads";
const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "😮", "😢", "🔥"]);

export class ApiRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

type AuthLikeError = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

function getAuthErrorCode(error: AuthLikeError | null | undefined) {
  const text = `${error?.code ?? ""} ${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();

  if (text.includes("email not confirmed")) return "EMAIL_NOT_CONFIRMED";
  if (error?.status === 422 || text.includes("user_already_exists") || text.includes("already registered") || text.includes("already exists")) {
    return "USER_EXISTS";
  }
  if (text.includes("password") && (text.includes("short") || text.includes("weak") || text.includes("6") || text.includes("six"))) {
    return "WEAK_PASSWORD";
  }
  if (text.includes("signup") && (text.includes("disabled") || text.includes("not allowed"))) {
    return "SIGNUP_DISABLED";
  }
  if (text.includes("invalid login credentials")) {
    return "INVALID_CREDENTIALS";
  }

  return "VALIDATION_ERROR";
}

function toUtcIsoString(value: string) {
  const normalized = value.trim();
  const hasExplicitTimezone = /[t\s]\d{2}:\d{2}.*(?:z|[+-]\d{2}(?::?\d{2})?)$/i.test(normalized);
  const safeValue = hasExplicitTimezone ? normalized : `${normalized}Z`;

  return new Date(safeValue).toISOString();
}

type UserRow = {
  id: string;
  username: string;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
  lastSeenAt: string | null;
  hideLastSeen: boolean;
  onlineVisibility: "everyone" | "nobody" | null;
  avatarVisibility: "everyone" | "nobody" | null;
  emailVisibility: "everyone" | "nobody" | null;
  lastSeenVisibility: "everyone" | "nobody" | null;
  createdAt: string;
};

type MessageRow = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  replyToMessageId: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  editedAt: string | null;
  isPinned: boolean;
  isForwarded: boolean;
  hiddenForSender: boolean;
  hiddenForReceiver: boolean;
  isRead: boolean;
};

type ContactRow = {
  id: string;
  ownerId: string;
  contactId: string;
  createdAt: string;
};

type UserBlockRow = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
};

type ChatPreferenceRow = {
  id: string;
  ownerId: string;
  targetId: string;
  muted: boolean;
};

export type MessageReactionRow = {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
};

export function toUserDTO(row: UserRow, online = false): UserDTO {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    handle: row.handle,
    avatarUrl: row.avatarUrl,
    bio: row.bio ?? "",
    lastSeenAt: row.lastSeenAt ? toUtcIsoString(row.lastSeenAt) : null,
    hideLastSeen: row.hideLastSeen ?? false,
    onlineVisibility: row.onlineVisibility ?? "everyone",
    avatarVisibility: row.avatarVisibility ?? "everyone",
    emailVisibility: row.emailVisibility ?? "nobody",
    lastSeenVisibility: row.lastSeenVisibility ?? (row.hideLastSeen ? "nobody" : "everyone"),
    createdAt: toUtcIsoString(row.createdAt),
    online
  };
}

export function toMessageDTO(row: MessageRow, reactions: MessageReactionDTO[] = []): MessageDTO {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    text: row.text,
    attachmentUrl: row.attachmentUrl,
    attachmentName: row.attachmentName,
    attachmentMime: row.attachmentMime,
    attachmentSize: row.attachmentSize,
    replyToMessageId: row.replyToMessageId ?? null,
    sentAt: toUtcIsoString(row.sentAt),
    deliveredAt: row.deliveredAt ? toUtcIsoString(row.deliveredAt) : null,
    readAt: row.readAt ? toUtcIsoString(row.readAt) : null,
    editedAt: row.editedAt ? toUtcIsoString(row.editedAt) : null,
    isPinned: row.isPinned,
    isForwarded: row.isForwarded ?? false,
    isRead: row.isRead,
    reactions
  };
}

function applyProfilePrivacy(user: UserDTO, viewerId: string) {
  if (user.id === viewerId) return user;

  return {
    ...user,
    email: user.emailVisibility === "everyone" ? user.email : "",
    avatarUrl: user.avatarVisibility === "everyone" ? user.avatarUrl : null,
    online: user.onlineVisibility === "everyone" ? user.online : false,
    lastSeenAt: user.lastSeenVisibility === "everyone" ? user.lastSeenAt : null,
    hideLastSeen: user.lastSeenVisibility === "nobody"
  };
}

export function toVisibleUserDTO(row: UserRow, viewerId: string, online = false) {
  return applyProfilePrivacy(toUserDTO(row, online), viewerId);
}

export function toMessageReactionDTO(row: MessageReactionRow): MessageReactionDTO {
  return {
    id: String(row.id ?? ""),
    messageId: String(row.messageId ?? ""),
    userId: String(row.userId ?? ""),
    emoji: String(row.emoji ?? ""),
    createdAt: row.createdAt ? toUtcIsoString(row.createdAt) : new Date(0).toISOString()
  };
}

function normalizeHandle(value: string) {
  return value.replace(/^@+/, "").trim().toLowerCase();
}

function handleFromUsername(username: string) {
  const base = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);

  return base.length >= 3 ? base : `user_${crypto.randomUUID().slice(0, 6)}`;
}

async function ensureProfile(user: { id: string; email?: string | null; user_metadata?: { username?: string } }) {
  const existing = await supabase.from("User").select("*").eq("id", user.id).maybeSingle<UserRow>();

  if (existing.error) {
    throw new ApiRequestError(existing.error.message, existing.error.code);
  }

  if (existing.data) {
    if (user.email && existing.data.email !== user.email) {
      const updated = await supabase.from("User").update({ email: user.email }).eq("id", user.id).select("*").single<UserRow>();
      if (updated.error) throw new ApiRequestError(updated.error.message, updated.error.code);
      return toUserDTO(updated.data);
    }
    return toUserDTO(existing.data);
  }

  const username = user.user_metadata?.username?.trim() || user.email?.split("@")[0] || "MinimalChat user";
  const profile = {
    id: user.id,
    username,
    email: user.email ?? "",
    handle: `${handleFromUsername(username)}_${user.id.slice(0, 5).toLowerCase()}`,
    avatarUrl: null,
    passwordHash: "supabase-auth"
  };
  const inserted = await supabase.from("User").insert(profile).select("*").single<UserRow>();

  if (inserted.error) {
    throw new ApiRequestError(inserted.error.message, inserted.error.code);
  }

  return toUserDTO(inserted.data);
}

async function findLastMessage(currentUserId: string, userId: string) {
  const result = await supabase
    .from("Message")
    .select("*")
    .or(
      `and(senderId.eq.${currentUserId},receiverId.eq.${userId},hiddenForSender.eq.false),and(senderId.eq.${userId},receiverId.eq.${currentUserId},hiddenForReceiver.eq.false)`
    )
    .order("sentAt", { ascending: false })
    .limit(1)
    .maybeSingle<MessageRow>();

  if (result.error) {
    throw new ApiRequestError(result.error.message, result.error.code);
  }

  return result.data ? toMessageDTO(result.data) : null;
}

async function countUnreadMessages(currentUserId: string, userId: string) {
  const result = await supabase
    .from("Message")
    .select("id", { count: "exact", head: true })
    .eq("senderId", userId)
    .eq("receiverId", currentUserId)
    .eq("hiddenForReceiver", false)
    .eq("isRead", false);

  if (result.error) {
    throw new ApiRequestError(result.error.message, result.error.code);
  }

  return result.count ?? 0;
}

async function userListItem(currentUserId: string, row: UserRow): Promise<UserListItemDTO> {
  const [contact, blockedByMe, hasBlockedMe, preference] = await Promise.all([
    supabase.from("Contact").select("id").eq("ownerId", currentUserId).eq("contactId", row.id).maybeSingle(),
    supabase.from("UserBlock").select("id").eq("blockerId", currentUserId).eq("blockedId", row.id).maybeSingle(),
    supabase.from("UserBlock").select("id").eq("blockerId", row.id).eq("blockedId", currentUserId).maybeSingle(),
    supabase.from("ChatPreference").select("*").eq("ownerId", currentUserId).eq("targetId", row.id).maybeSingle<ChatPreferenceRow>()
  ]);
  const error = contact.error ?? blockedByMe.error ?? hasBlockedMe.error ?? preference.error;
  if (error) throw new ApiRequestError(error.message, error.code);

  return {
    ...applyProfilePrivacy(toUserDTO(row), currentUserId),
    lastMessage: await findLastMessage(currentUserId, row.id),
    unreadCount: await countUnreadMessages(currentUserId, row.id),
    isContact: Boolean(contact.data),
    isBlockedByMe: Boolean(blockedByMe.data),
    hasBlockedMe: Boolean(hasBlockedMe.data),
    notificationsMuted: Boolean(preference.data?.muted)
  };
}

async function fetchConversationUsers(currentUserId: string) {
  const result = await supabase
    .from("Message")
    .select("*")
    .or(
      `and(senderId.eq.${currentUserId},hiddenForSender.eq.false),and(receiverId.eq.${currentUserId},hiddenForReceiver.eq.false)`
    )
    .order("sentAt", { ascending: false })
    .returns<MessageRow[]>();

  if (result.error) {
    throw new ApiRequestError(result.error.message, result.error.code);
  }

  const otherIds = Array.from(
    new Set((result.data ?? []).map((message) => (message.senderId === currentUserId ? message.receiverId : message.senderId)))
  );

  if (!otherIds.length) return [];

  const users = await supabase.from("User").select("*").in("id", otherIds).returns<UserRow[]>();

  if (users.error) {
    throw new ApiRequestError(users.error.message, users.error.code);
  }

  const byId = new Map((users.data ?? []).map((user) => [user.id, user]));
  return Promise.all(otherIds.map((id) => byId.get(id)).filter(Boolean).map((item) => userListItem(currentUserId, item as UserRow)));
}

async function uploadAttachment(file: File) {
  const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const objectPath = `messages/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const uploaded = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploaded.error) {
    throw new ApiRequestError(uploaded.error.message, uploaded.error.name);
  }

  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

export const api = {
  async currentUser(): Promise<UserDTO | null> {
    const auth = await supabase.auth.getUser();

    if (auth.error || !auth.data.user) {
      return null;
    }

    return ensureProfile(auth.data.user);
  },

  async register(payload: RegisterDTO): Promise<AuthResponseDTO> {
    const auth = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          username: payload.username
        }
      }
    });

    if (auth.error) {
      throw new ApiRequestError(auth.error.message, getAuthErrorCode(auth.error));
    }

    if (!auth.data.user) {
      throw new ApiRequestError("Could not create user", "VALIDATION_ERROR");
    }

    if (!auth.data.session) {
      const login = await supabase.auth.signInWithPassword({ email: payload.email, password: payload.password });

      if (login.error) {
        throw new ApiRequestError(login.error.message, getAuthErrorCode(login.error));
      }
    }

    return { user: await ensureProfile(auth.data.user) };
  },

  async login(payload: LoginDTO): Promise<AuthResponseDTO> {
    const auth = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (auth.error || !auth.data.user) {
      throw new ApiRequestError(
        auth.error?.message ?? "Invalid email or password",
        auth.error ? getAuthErrorCode(auth.error) : "INVALID_CREDENTIALS"
      );
    }

    return { user: await ensureProfile(auth.data.user) };
  },

  async logout() {
    await this.updateLastSeen();
    await supabase.auth.signOut();
  },

  async updateLastSeen(userId?: string) {
    const currentUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!currentUserId) return;

    await supabase
      .from("User")
      .update({ lastSeenAt: new Date().toISOString() })
      .eq("id", currentUserId);
  },

  async updateLastSeenPrivacy(currentUserId: string, hideLastSeen: boolean): Promise<{ user: UserDTO }> {
    const result = await supabase
      .from("User")
      .update({ hideLastSeen })
      .eq("id", currentUserId)
      .select("*")
      .single<UserRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { user: toUserDTO(result.data, true) };
  },

  async updatePrivacy(currentUserId: string, settings: PrivacySettingsDTO): Promise<{ user: UserDTO }> {
    const result = await supabase
      .from("User")
      .update({
        ...settings,
        hideLastSeen: settings.lastSeenVisibility === "nobody"
      })
      .eq("id", currentUserId)
      .select("*")
      .single<UserRow>();

    if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    return { user: toUserDTO(result.data, true) };
  },

  async users(currentUserId: string, search?: string): Promise<{ users: UserListItemDTO[] }> {
    if (search?.trim()) {
      const handle = normalizeHandle(search);

      if (!handle) return { users: [] };

      const result = await supabase
        .from("User")
        .select("*")
        .neq("id", currentUserId)
        .eq("handle", handle)
        .limit(1)
        .returns<UserRow[]>();

      if (result.error) {
        throw new ApiRequestError(result.error.message, result.error.code);
      }

      return { users: await Promise.all((result.data ?? []).map((row) => userListItem(currentUserId, row))) };
    }

    return { users: await fetchConversationUsers(currentUserId) };
  },

  async updateProfile(currentUserId: string, payload: UpdateProfileDTO): Promise<{ user: UserDTO }> {
    const handle = normalizeHandle(payload.handle);
    const result = await supabase
      .from("User")
      .update({
        username: payload.username.trim(),
        handle,
        avatarUrl: payload.avatarUrl ?? null,
        bio: payload.bio?.trim() ?? ""
      })
      .eq("id", currentUserId)
      .select("*")
      .single<UserRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code === "23505" ? "HANDLE_TAKEN" : result.error.code);
    }

    return { user: toUserDTO(result.data) };
  },

  async messages(currentUserId: string, userId: string): Promise<{ messages: MessageDTO[] }> {
    await this.markMessagesRead(currentUserId, userId);
    const result = await supabase
      .from("Message")
      .select("*")
      .or(
        `and(senderId.eq.${currentUserId},receiverId.eq.${userId},hiddenForSender.eq.false),and(senderId.eq.${userId},receiverId.eq.${currentUserId},hiddenForReceiver.eq.false)`
      )
      .order("sentAt", { ascending: true })
      .returns<MessageRow[]>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    const rows = result.data ?? [];
    const messageIds = rows.map((message) => message.id);
    const reactionsResult = messageIds.length
      ? await supabase.from("MessageReaction").select("*").in("messageId", messageIds).returns<MessageReactionRow[]>()
      : { data: [], error: null };

    if (reactionsResult.error) {
      throw new ApiRequestError(reactionsResult.error.message, reactionsResult.error.code);
    }

    const reactionsByMessage = new Map<string, MessageReactionDTO[]>();
    (reactionsResult.data ?? []).forEach((row) => {
      const reaction = toMessageReactionDTO(row);
      const reactions = reactionsByMessage.get(reaction.messageId) ?? [];
      reactions.push(reaction);
      reactionsByMessage.set(reaction.messageId, reactions);
    });

    return {
      messages: rows.map((row) => toMessageDTO(row, reactionsByMessage.get(row.id) ?? []))
    };
  },

  async contacts(currentUserId: string): Promise<{ users: UserListItemDTO[] }> {
    const contacts = await supabase
      .from("Contact")
      .select("*")
      .eq("ownerId", currentUserId)
      .order("createdAt", { ascending: false })
      .returns<ContactRow[]>();

    if (contacts.error) throw new ApiRequestError(contacts.error.message, contacts.error.code);
    const ids = (contacts.data ?? []).map((item) => item.contactId);
    if (!ids.length) return { users: [] };

    const users = await supabase.from("User").select("*").in("id", ids).returns<UserRow[]>();
    if (users.error) throw new ApiRequestError(users.error.message, users.error.code);

    const byId = new Map((users.data ?? []).map((item) => [item.id, item]));
    return {
      users: await Promise.all(ids.map((id) => byId.get(id)).filter(Boolean).map((row) => userListItem(currentUserId, row as UserRow)))
    };
  },

  async setContact(currentUserId: string, contactId: string, enabled: boolean) {
    if (enabled) {
      const result = await supabase.from("Contact").upsert(
        { id: crypto.randomUUID(), ownerId: currentUserId, contactId },
        { onConflict: "ownerId,contactId", ignoreDuplicates: true }
      );
      if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    } else {
      const result = await supabase.from("Contact").delete().eq("ownerId", currentUserId).eq("contactId", contactId);
      if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    }
    return { enabled };
  },

  async setBlocked(currentUserId: string, blockedId: string, enabled: boolean) {
    if (enabled) {
      const result = await supabase.from("UserBlock").upsert(
        { id: crypto.randomUUID(), blockerId: currentUserId, blockedId },
        { onConflict: "blockerId,blockedId", ignoreDuplicates: true }
      );
      if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    } else {
      const result = await supabase.from("UserBlock").delete().eq("blockerId", currentUserId).eq("blockedId", blockedId);
      if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    }
    return { enabled };
  },

  async setChatMuted(currentUserId: string, targetId: string, muted: boolean) {
    const result = await supabase.from("ChatPreference").upsert(
      {
        id: crypto.randomUUID(),
        ownerId: currentUserId,
        targetId,
        muted,
        updatedAt: new Date().toISOString()
      },
      { onConflict: "ownerId,targetId" }
    );
    if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    return { muted };
  },

  async mutedChatIds(currentUserId: string) {
    const result = await supabase
      .from("ChatPreference")
      .select("targetId")
      .eq("ownerId", currentUserId)
      .eq("muted", true)
      .returns<Array<{ targetId: string }>>();
    if (result.error) throw new ApiRequestError(result.error.message, result.error.code);
    return (result.data ?? []).map((item) => item.targetId);
  },

  async updateEmail(currentUserId: string, email: string) {
    const auth = await supabase.auth.updateUser({ email: email.trim() });
    if (auth.error) throw new ApiRequestError(auth.error.message, getAuthErrorCode(auth.error));

    if (auth.data.user.email === email.trim()) {
      const profile = await supabase.from("User").update({ email: email.trim() }).eq("id", currentUserId);
      if (profile.error) throw new ApiRequestError(profile.error.message, profile.error.code);
    }

    return { email: auth.data.user.email ?? email.trim(), confirmationRequired: auth.data.user.email !== email.trim() };
  },

  async updatePassword(password: string) {
    const result = await supabase.auth.updateUser({ password });
    if (result.error) throw new ApiRequestError(result.error.message, getAuthErrorCode(result.error));
    return { ok: true };
  },

  async sendMessage(payload: SendMessageDTO): Promise<{ message: MessageDTO }> {
    const result = await supabase
      .from("Message")
      .insert({
        id: crypto.randomUUID(),
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        text: payload.text.trim(),
        replyToMessageId: payload.replyToMessageId ?? null
      })
      .select("*")
      .single<MessageRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { message: toMessageDTO(result.data) };
  },

  async sendMessageWithFile(payload: SendMessageDTO & { file?: File | null }): Promise<{ message: MessageDTO }> {
    const attachmentUrl = payload.file ? await uploadAttachment(payload.file) : null;
    const result = await supabase
      .from("Message")
      .insert({
        id: crypto.randomUUID(),
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        text: payload.text.trim(),
        attachmentUrl,
        attachmentName: payload.file?.name ?? null,
        attachmentMime: payload.file?.type || null,
        attachmentSize: payload.file?.size ?? null,
        replyToMessageId: payload.replyToMessageId ?? null
      })
      .select("*")
      .single<MessageRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { message: toMessageDTO(result.data) };
  },

  async editMessage(messageId: string, currentUserId: string, text: string): Promise<{ message: MessageDTO }> {
    const result = await supabase
      .from("Message")
      .update({ text: text.trim(), editedAt: new Date().toISOString() })
      .eq("id", messageId)
      .eq("senderId", currentUserId)
      .select("*")
      .single<MessageRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { message: toMessageDTO(result.data) };
  },

  async pinMessage(messageId: string, _currentUserId: string, isPinned: boolean): Promise<{ message: MessageDTO }> {
    const result = await supabase
      .from("Message")
      .update({ isPinned })
      .eq("id", messageId)
      .select("*")
      .single<MessageRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { message: toMessageDTO(result.data) };
  },

  async forwardMessage(
    source: MessageDTO,
    senderId: string,
    receiverId: string
  ): Promise<{ message: MessageDTO }> {
    const result = await supabase
      .from("Message")
      .insert({
        id: crypto.randomUUID(),
        senderId,
        receiverId,
        text: source.text,
        attachmentUrl: source.attachmentUrl,
        attachmentName: source.attachmentName,
        attachmentMime: source.attachmentMime,
        attachmentSize: source.attachmentSize,
        replyToMessageId: null,
        isForwarded: true
      })
      .select("*")
      .single<MessageRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { message: toMessageDTO(result.data) };
  },

  async toggleReaction(
    messageId: string,
    currentUserId: string,
    emoji: string
  ): Promise<{ action: "added" | "removed"; reaction: MessageReactionDTO }> {
    if (!ALLOWED_REACTIONS.has(emoji)) {
      throw new ApiRequestError("Unsupported reaction", "VALIDATION_ERROR");
    }

    const existing = await supabase
      .from("MessageReaction")
      .select("*")
      .eq("messageId", messageId)
      .eq("userId", currentUserId)
      .eq("emoji", emoji)
      .maybeSingle<MessageReactionRow>();

    if (existing.error) {
      throw new ApiRequestError(existing.error.message, existing.error.code);
    }

    if (existing.data) {
      const removed = toMessageReactionDTO(existing.data);
      const result = await supabase.from("MessageReaction").delete().eq("id", existing.data.id);

      if (result.error) {
        throw new ApiRequestError(result.error.message, result.error.code);
      }

      return { action: "removed", reaction: removed };
    }

    const result = await supabase
      .from("MessageReaction")
      .insert({
        id: crypto.randomUUID(),
        messageId,
        userId: currentUserId,
        emoji
      })
      .select("*")
      .single<MessageReactionRow>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { action: "added", reaction: toMessageReactionDTO(result.data) };
  },

  async deleteMessage(messageId: string, currentUserId: string, mode: "me" | "all") {
    if (mode === "me") {
      const existing = await supabase.from("Message").select("*").eq("id", messageId).single<MessageRow>();

      if (existing.error) {
        throw new ApiRequestError(existing.error.message, existing.error.code);
      }

      const isSavedMessage =
        existing.data.senderId === currentUserId && existing.data.receiverId === currentUserId;
      const data = isSavedMessage
        ? { hiddenForSender: true, hiddenForReceiver: true }
        : existing.data.senderId === currentUserId
          ? { hiddenForSender: true }
          : { hiddenForReceiver: true };
      const result = await supabase.from("Message").update(data).eq("id", messageId);

      if (result.error) {
        throw new ApiRequestError(result.error.message, result.error.code);
      }

      return { ok: true, id: messageId, mode };
    }

    const result = await supabase.from("Message").delete().eq("id", messageId);

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { ok: true, id: messageId, mode };
  },

  async clearConversation(currentUserId: string, otherUserId: string, mode: "me" | "all") {
    const conversationFilter =
      `and(senderId.eq.${currentUserId},receiverId.eq.${otherUserId}),` +
      `and(senderId.eq.${otherUserId},receiverId.eq.${currentUserId})`;

    if (mode === "all") {
      const result = await supabase.from("Message").delete().or(conversationFilter);

      if (result.error) {
        throw new ApiRequestError(result.error.message, result.error.code);
      }

      return { ok: true, mode };
    }

    if (currentUserId === otherUserId) {
      const result = await supabase
        .from("Message")
        .update({ hiddenForSender: true, hiddenForReceiver: true })
        .eq("senderId", currentUserId)
        .eq("receiverId", currentUserId);

      if (result.error) {
        throw new ApiRequestError(result.error.message, result.error.code);
      }

      return { ok: true, mode };
    }

    const [sent, received] = await Promise.all([
      supabase
        .from("Message")
        .update({ hiddenForSender: true })
        .eq("senderId", currentUserId)
        .eq("receiverId", otherUserId),
      supabase
        .from("Message")
        .update({ hiddenForReceiver: true })
        .eq("senderId", otherUserId)
        .eq("receiverId", currentUserId)
    ]);

    const error = sent.error ?? received.error;
    if (error) {
      throw new ApiRequestError(error.message, error.code);
    }

    return { ok: true, mode };
  },

  async markMessagesDelivered(currentUserId: string, otherUserId: string): Promise<{ messages: MessageDTO[] }> {
    const result = await supabase
      .from("Message")
      .update({ deliveredAt: new Date().toISOString() })
      .eq("senderId", otherUserId)
      .eq("receiverId", currentUserId)
      .is("deliveredAt", null)
      .select("*")
      .returns<MessageRow[]>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { messages: (result.data ?? []).map((row) => toMessageDTO(row)) };
  },

  async markMessagesRead(currentUserId: string, otherUserId: string): Promise<{ messages: MessageDTO[] }> {
    const now = new Date().toISOString();
    const result = await supabase
      .from("Message")
      .update({ isRead: true, deliveredAt: now, readAt: now })
      .eq("senderId", otherUserId)
      .eq("receiverId", currentUserId)
      .eq("isRead", false)
      .select("*")
      .returns<MessageRow[]>();

    if (result.error) {
      throw new ApiRequestError(result.error.message, result.error.code);
    }

    return { messages: (result.data ?? []).map((row) => toMessageDTO(row)) };
  }
};
