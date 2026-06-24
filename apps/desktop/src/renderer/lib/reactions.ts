import type { MessageDTO, MessageReactionDTO } from "@minimalchat/shared";

export type ReactionUpdate =
  | { action: "added"; reaction: MessageReactionDTO }
  | { action: "removed"; reactionId: string };

export function getDeletedReactionId(value: unknown) {
  if (!value || typeof value !== "object" || !("id" in value)) return "";
  return String((value as { id?: unknown }).id ?? "");
}

export function applyReactionUpdate(messages: MessageDTO[], update: ReactionUpdate) {
  if (update.action === "removed") {
    return messages.map((message) => {
      const reactions = message.reactions.filter((item) => item.id !== update.reactionId);
      return reactions.length === message.reactions.length ? message : { ...message, reactions };
    });
  }

  const { reaction } = update;

  return messages.map((message) => {
    if (message.id !== reaction.messageId) return message;

    if (message.reactions.some((item) => item.id === reaction.id)) {
      return message;
    }

    return {
      ...message,
      reactions: [...message.reactions, reaction]
    };
  });
}
