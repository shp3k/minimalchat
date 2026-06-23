import type { Message, MessageReaction, User } from "@prisma/client";
import type { MessageDTO, MessageReactionDTO, UserDTO } from "@minimalchat/shared";

export function toUserDTO(user: User, online = false): UserDTO {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    hideLastSeen: user.hideLastSeen,
    createdAt: user.createdAt.toISOString(),
    online
  };
}

export function toMessageDTO(message: Message, reactions: MessageReaction[] = []): MessageDTO {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    text: message.text,
    attachmentUrl: message.attachmentUrl,
    attachmentName: message.attachmentName,
    attachmentMime: message.attachmentMime,
    attachmentSize: message.attachmentSize,
    replyToMessageId: (message as Message & { replyToMessageId?: string | null }).replyToMessageId ?? null,
    sentAt: message.sentAt.toISOString(),
    deliveredAt: message.deliveredAt ? message.deliveredAt.toISOString() : null,
    readAt: message.readAt ? message.readAt.toISOString() : message.isRead ? message.sentAt.toISOString() : null,
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    isPinned: message.isPinned,
    isRead: message.isRead,
    reactions: reactions.map(toMessageReactionDTO)
  };
}

export function toMessageReactionDTO(reaction: MessageReaction): MessageReactionDTO {
  return {
    id: reaction.id,
    messageId: reaction.messageId,
    userId: reaction.userId,
    emoji: reaction.emoji,
    createdAt: reaction.createdAt.toISOString()
  };
}
