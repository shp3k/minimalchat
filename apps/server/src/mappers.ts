import type { Message, User } from "@prisma/client";
import type { MessageDTO, UserDTO } from "@minimalchat/shared";

export function toUserDTO(user: User, online = false): UserDTO {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    online
  };
}

export function toMessageDTO(message: Message): MessageDTO {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    text: message.text,
    attachmentUrl: message.attachmentUrl,
    attachmentName: message.attachmentName,
    attachmentMime: message.attachmentMime,
    attachmentSize: message.attachmentSize,
    sentAt: message.sentAt.toISOString(),
    deliveredAt: message.deliveredAt ? message.deliveredAt.toISOString() : null,
    readAt: message.readAt ? message.readAt.toISOString() : message.isRead ? message.sentAt.toISOString() : null,
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    isPinned: message.isPinned,
    isRead: message.isRead
  };
}
