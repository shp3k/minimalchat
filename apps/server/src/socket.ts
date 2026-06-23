import type { Server } from "socket.io";
import type { MessageDTO, SendMessageDTO, TypingDTO } from "@minimalchat/shared";
import { prisma } from "./db.js";
import { toMessageDTO } from "./mappers.js";

let ioRef: Server | null = null;
const socketsByUserId = new Map<string, Set<string>>();
const userBySocketId = new Map<string, string>();

export function getOnlineUserIds() {
  return new Set(socketsByUserId.keys());
}

export function emitMessage(message: MessageDTO) {
  if (!ioRef) return;
  ioRef.to(message.senderId).to(message.receiverId).emit("message:receive", message);
}

export function emitMessageUpdate(message: MessageDTO) {
  if (!ioRef) return;
  ioRef.to(message.senderId).to(message.receiverId).emit("message:update", message);
}

export function emitMessageDelete(message: MessageDTO) {
  if (!ioRef) return;
  ioRef.to(message.senderId).to(message.receiverId).emit("message:delete", { id: message.id });
}

async function markDeliveredMessages(userId: string) {
  const pending = await prisma.message.findMany({
    where: {
      receiverId: userId,
      deliveredAt: null
    },
    select: { id: true }
  });

  if (!pending.length) return;

  const ids = pending.map((message) => message.id);
  await prisma.message.updateMany({
    where: { id: { in: ids } },
    data: { deliveredAt: new Date() }
  });

  const updated = await prisma.message.findMany({ where: { id: { in: ids } } });
  updated.map(toMessageDTO).forEach(emitMessageUpdate);
}

function addSocket(userId: string, socketId: string) {
  const sockets = socketsByUserId.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  socketsByUserId.set(userId, sockets);
  userBySocketId.set(socketId, userId);
}

function removeSocket(socketId: string) {
  const userId = userBySocketId.get(socketId);
  if (!userId) return null;

  const sockets = socketsByUserId.get(userId);
  sockets?.delete(socketId);
  userBySocketId.delete(socketId);

  if (!sockets || sockets.size === 0) {
    socketsByUserId.delete(userId);
    return userId;
  }

  return null;
}

async function updateLastSeen(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() }
    });
  } catch {
    // Last seen is best-effort and should not break presence updates.
  }
}

export function setupSocket(io: Server) {
  ioRef = io;

  io.on("connection", (socket) => {
    socket.emit("user:online", { userIds: Array.from(socketsByUserId.keys()) });

    socket.on("user:connect", (userId: string) => {
      if (!userId) return;
      const wasOffline = !socketsByUserId.has(userId);
      addSocket(userId, socket.id);
      socket.join(userId);
      socket.emit("user:online", { userIds: Array.from(socketsByUserId.keys()) });
      void markDeliveredMessages(userId);

      if (wasOffline) {
        socket.broadcast.emit("user:online", { userIds: [userId] });
      }
    });

    socket.on("user:disconnect", () => {
      const offlineUserId = removeSocket(socket.id);
      if (offlineUserId) {
        void updateLastSeen(offlineUserId);
        socket.broadcast.emit("user:offline", { userIds: [offlineUserId] });
      }
    });

    socket.on("message:send", async (payload: SendMessageDTO, ack?: (response: unknown) => void) => {
      try {
        const text = payload.text.trim();

        if (!payload.senderId || !payload.receiverId || !text || text.length > 1000) {
          ack?.({ ok: false, error: "Message is invalid" });
          return;
        }

        const message = await prisma.message.create({
          data: {
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            text,
            deliveredAt: socketsByUserId.has(payload.receiverId) ? new Date() : null,
            replyToMessageId: payload.replyToMessageId ?? null
          } as any
        });
        const dto = toMessageDTO(message);
        emitMessage(dto);
        ack?.({ ok: true, message: dto });
      } catch {
        ack?.({ ok: false, error: "Could not send message" });
      }
    });

    socket.on("typing", (payload: TypingDTO) => {
      if (!payload.senderId || !payload.receiverId || payload.senderId === payload.receiverId) return;

      io.to(payload.receiverId).emit("typing", payload);
    });

    socket.on("disconnect", () => {
      const offlineUserId = removeSocket(socket.id);
      if (offlineUserId) {
        void updateLastSeen(offlineUserId);
        socket.broadcast.emit("user:offline", { userIds: [offlineUserId] });
      }
    });
  });
}
