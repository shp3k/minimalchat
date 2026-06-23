export interface UserDTO {
  id: string;
  username: string;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  online?: boolean;
}

export interface UserListItemDTO extends UserDTO {
  lastMessage?: MessageDTO | null;
  unreadCount: number;
}

export interface MessageDTO {
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
  isRead: boolean;
}

export interface AuthResponseDTO {
  user: UserDTO;
}

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SendMessageDTO {
  senderId: string;
  receiverId: string;
  text: string;
  replyToMessageId?: string | null;
}

export interface UpdateProfileDTO {
  username: string;
  handle: string;
  avatarUrl?: string | null;
}

export interface ApiErrorDTO {
  message: string;
  code?: string;
}

export interface OnlineUsersDTO {
  userIds: string[];
}

export interface TypingDTO {
  senderId: string;
  receiverId: string;
  isTyping: boolean;
}
