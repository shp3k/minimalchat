import type {
  AuthResponseDTO,
  LoginDTO,
  MessageDTO,
  RegisterDTO,
  SendMessageDTO,
  UpdateProfileDTO,
  UserDTO,
  UserListItemDTO
} from "@minimalchat/shared";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "minimalchat-uploads";

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
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  editedAt: string | null;
  isPinned: boolean;
  hiddenForSender: boolean;
  hiddenForReceiver: boolean;
  isRead: boolean;
};

function toUserDTO(row: UserRow, online = false): UserDTO {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    handle: row.handle,
    avatarUrl: row.avatarUrl,
    createdAt: toUtcIsoString(row.createdAt),
    online
  };
}

export function toMessageDTO(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    text: row.text,
    attachmentUrl: row.attachmentUrl,
    attachmentName: row.attachmentName,
    attachmentMime: row.attachmentMime,
    attachmentSize: row.attachmentSize,
    sentAt: toUtcIsoString(row.sentAt),
    deliveredAt: row.deliveredAt ? toUtcIsoString(row.deliveredAt) : null,
    readAt: row.readAt ? toUtcIsoString(row.readAt) : null,
    editedAt: row.editedAt ? toUtcIsoString(row.editedAt) : null,
    isPinned: row.isPinned,
    isRead: row.isRead
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
  return {
    ...toUserDTO(row),
    lastMessage: await findLastMessage(currentUserId, row.id),
    unreadCount: await countUnreadMessages(currentUserId, row.id)
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
    await supabase.auth.signOut();
  },

  async users(currentUserId: string, search?: string): Promise<{ users: UserListItemDTO[] }> {
    if (search?.trim()) {
      const handle = normalizeHandle(search);

      if (!handle) return { users: [] };

      const result = await supabase
        .from("User")
        .select("*")
        .neq("id", currentUserId)
        .ilike("handle", `${handle}%`)
        .order("handle", { ascending: true })
        .limit(12)
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
        avatarUrl: payload.avatarUrl ?? null
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

    return { messages: (result.data ?? []).map(toMessageDTO) };
  },

  async sendMessage(payload: SendMessageDTO): Promise<{ message: MessageDTO }> {
    const result = await supabase
      .from("Message")
      .insert({
        id: crypto.randomUUID(),
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        text: payload.text.trim()
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
        attachmentSize: payload.file?.size ?? null
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

  async deleteMessage(messageId: string, currentUserId: string, mode: "me" | "all") {
    if (mode === "me") {
      const existing = await supabase.from("Message").select("*").eq("id", messageId).single<MessageRow>();

      if (existing.error) {
        throw new ApiRequestError(existing.error.message, existing.error.code);
      }

      const data =
        existing.data.senderId === currentUserId ? { hiddenForSender: true } : { hiddenForReceiver: true };
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

    return { messages: (result.data ?? []).map(toMessageDTO) };
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

    return { messages: (result.data ?? []).map(toMessageDTO) };
  }
};
