export interface UserDTO {
  id: string;
  username: string;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  bio: string;
  lastSeenAt: string | null;
  hideLastSeen: boolean;
  onlineVisibility: ProfileVisibility;
  avatarVisibility: ProfileVisibility;
  emailVisibility: ProfileVisibility;
  lastSeenVisibility: ProfileVisibility;
  createdAt: string;
  online?: boolean;
}

export interface UserListItemDTO extends UserDTO {
  lastMessage?: MessageDTO | null;
  unreadCount: number;
  isSavedMessages?: boolean;
  isContact?: boolean;
  isBlockedByMe?: boolean;
  hasBlockedMe?: boolean;
  notificationsMuted?: boolean;
}

export type ProfileVisibility = "everyone" | "nobody";

export interface PrivacySettingsDTO {
  onlineVisibility: ProfileVisibility;
  avatarVisibility: ProfileVisibility;
  emailVisibility: ProfileVisibility;
  lastSeenVisibility: ProfileVisibility;
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
  isForwarded: boolean;
  isRead: boolean;
  reactions: MessageReactionDTO[];
}

export interface MessageReactionDTO {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
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
  bio?: string;
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

export type SpaceType = "group" | "channel";
export type SpaceRole = "owner" | "admin" | "member";
export type SpaceMessageKind = "message" | "post" | "comment";

export interface SpaceMemberDTO {
  id: string;
  userId: string;
  role: SpaceRole;
  joinedAt: string;
  user: UserDTO;
}

export interface SpaceMessageDTO {
  id: string;
  spaceId: string;
  senderId: string;
  senderName: string;
  senderHandle: string | null;
  senderAvatarUrl: string | null;
  text: string;
  kind: SpaceMessageKind;
  parentPostId: string | null;
  sentAt: string;
  editedAt: string | null;
}

export interface SpaceDTO {
  id: string;
  type: SpaceType;
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  description: string;
  commentsEnabled: boolean;
  ownerId: string;
  createdAt: string;
  role: SpaceRole;
  subscribed: boolean;
  memberCount: number;
  lastMessage: SpaceMessageDTO | null;
}
