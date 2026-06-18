import { io, type Socket } from "socket.io-client";
import type { MessageDTO, OnlineUsersDTO, SendMessageDTO } from "@minimalchat/shared";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export function createChatSocket(userId: string) {
  const socket: Socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800
  });

  socket.on("connect", () => {
    socket.emit("user:connect", userId);
  });

  return socket;
}

export type ChatSocket = ReturnType<typeof createChatSocket>;

export type SocketEvents = {
  receive: (message: MessageDTO) => void;
  online: (payload: OnlineUsersDTO) => void;
  offline: (payload: OnlineUsersDTO) => void;
};

export function sendSocketMessage(socket: ChatSocket | null, payload: SendMessageDTO) {
  return new Promise<{ ok: boolean; message?: MessageDTO; error?: string; code?: string }>((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: "Server is unavailable. Message was not sent.", code: "SERVER_UNAVAILABLE" });
      return;
    }

    socket.emit("message:send", payload, (response: { ok: boolean; message?: MessageDTO; error?: string }) => {
      if (response.ok) {
        resolve({ ok: true, message: response.message });
      } else {
        resolve({ ok: false, error: response.error ?? "Could not send message.", code: "SEND_FAILED" });
      }
    });
  });
}
