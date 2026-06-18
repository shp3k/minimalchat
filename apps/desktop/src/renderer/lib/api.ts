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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  } catch {
    throw new ApiRequestError("Server is unavailable. Check that MinimalChat server is running.", "SERVER_UNAVAILABLE");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiRequestError(data.message ?? "Request failed", data.code);
  }

  return data as T;
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      body
    });
  } catch {
    throw new ApiRequestError("Server is unavailable. Check that MinimalChat server is running.", "SERVER_UNAVAILABLE");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiRequestError(data.message ?? "Request failed", data.code);
  }

  return data as T;
}

export const api = {
  register(payload: RegisterDTO) {
    return request<AuthResponseDTO>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload: LoginDTO) {
    return request<AuthResponseDTO>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  users(currentUserId: string, search?: string) {
    const params = new URLSearchParams({ currentUserId });

    if (search) {
      params.set("search", search);
    }

    return request<{ users: UserListItemDTO[] }>(`/api/users?${params.toString()}`);
  },
  updateProfile(currentUserId: string, payload: UpdateProfileDTO) {
    return request<{ user: UserDTO }>(`/api/users/me?currentUserId=${encodeURIComponent(currentUserId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  messages(currentUserId: string, userId: string) {
    return request<{ messages: MessageDTO[] }>(
      `/api/messages/${encodeURIComponent(userId)}?currentUserId=${encodeURIComponent(currentUserId)}`
    );
  },
  sendMessage(payload: SendMessageDTO) {
    return request<{ message: MessageDTO }>("/api/messages/send", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  sendMessageWithFile(payload: SendMessageDTO & { file?: File | null }) {
    const body = new FormData();
    body.set("senderId", payload.senderId);
    body.set("receiverId", payload.receiverId);
    body.set("text", payload.text);

    if (payload.file) {
      body.set("file", payload.file);
    }

    return requestForm<{ message: MessageDTO }>("/api/messages/send", body);
  },
  editMessage(messageId: string, currentUserId: string, text: string) {
    return request<{ message: MessageDTO }>(`/api/messages/${encodeURIComponent(messageId)}`, {
      method: "PATCH",
      body: JSON.stringify({ currentUserId, text })
    });
  },
  pinMessage(messageId: string, currentUserId: string, isPinned: boolean) {
    return request<{ message: MessageDTO }>(`/api/messages/${encodeURIComponent(messageId)}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ currentUserId, isPinned })
    });
  },
  deleteMessage(messageId: string, currentUserId: string, mode: "me" | "all") {
    return request<{ ok: boolean; id: string; mode: "me" | "all" }>(`/api/messages/${encodeURIComponent(messageId)}`, {
      method: "DELETE",
      body: JSON.stringify({ currentUserId, mode })
    });
  },
  markMessagesRead(currentUserId: string, otherUserId: string) {
    return request<{ messages: MessageDTO[] }>("/api/messages/read", {
      method: "PATCH",
      body: JSON.stringify({ currentUserId, otherUserId })
    });
  }
};
