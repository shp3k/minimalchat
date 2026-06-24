import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MessageDTO, OnlineUsersDTO, SendMessageDTO, TypingDTO } from "@minimalchat/shared";
import { api, toMessageDTO, toMessageReactionDTO, toUserDTO } from "@/lib/api";
import { getDeletedReactionId } from "@/lib/reactions";
import { supabase } from "@/lib/supabase";

type Handler = (...args: any[]) => void;
type PopupPayload = { id: string };

export class SupabaseChatSocket {
  connected = false;
  private handlers = new Map<string, Set<Handler>>();
  private channel: RealtimeChannel;
  private onlineIds = new Set<string>();
  private lastSeenTimer: number | null = null;

  constructor(private userId: string) {
    this.channel = supabase
      .channel("minimalchat", {
        config: {
          presence: {
            key: userId
          }
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message" },
        async (payload) => {
          const message = toMessageDTO(payload.new as any);

          if (message.receiverId === this.userId) {
            void api.markMessagesDelivered(this.userId, message.senderId);
          }

          this.emitLocal("message:receive", message);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Message" }, (payload) => {
        this.emitLocal("message:update", toMessageDTO(payload.new as any));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Message" }, (payload) => {
        this.emitLocal("message:delete", { id: (payload.old as PopupPayload).id });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "MessageReaction" }, (payload) => {
        this.emitLocal("reaction:update", {
          action: "added",
          reaction: toMessageReactionDTO(payload.new as any)
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "MessageReaction" }, (payload) => {
        const reactionId = getDeletedReactionId(payload.old);

        if (reactionId) {
          this.emitLocal("reaction:update", {
            action: "removed",
            reactionId
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "User" }, (payload) => {
        this.emitLocal("user:update", toUserDTO(payload.new as any));
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const typing = payload.payload as TypingDTO;

        if (typing.receiverId === this.userId) {
          this.emitLocal("typing", typing);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const nextIds = new Set(
          Object.values(this.channel.presenceState())
            .flat()
            .map((item: any) => String(item.userId ?? ""))
            .filter(Boolean)
        );
        const online = Array.from(nextIds).filter((id) => !this.onlineIds.has(id));
        const offline = Array.from(this.onlineIds).filter((id) => !nextIds.has(id));

        this.onlineIds = nextIds;

        if (online.length) {
          this.emitLocal("user:online", { userIds: online } satisfies OnlineUsersDTO);
        }
        if (offline.length) {
          this.emitLocal("user:offline", { userIds: offline } satisfies OnlineUsersDTO);
        }
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        await this.channel.track({ userId });
        this.connected = true;
        void api.updateLastSeen(userId);
        this.lastSeenTimer = window.setInterval(() => {
          void api.updateLastSeen(userId);
        }, 30_000);
        this.emitLocal("connect");
      });
  }

  on(event: string, handler: Handler) {
    const handlers = this.handlers.get(event) ?? new Set<Handler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  emit(event: string, payload?: unknown) {
    if (event === "user:disconnect") {
      this.disconnect();
    }

    if (event === "typing" && this.connected) {
      void this.channel.send({
        type: "broadcast",
        event: "typing",
        payload
      });
    }
  }

  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    if (this.lastSeenTimer !== null) {
      window.clearInterval(this.lastSeenTimer);
      this.lastSeenTimer = null;
    }
    void api.updateLastSeen(this.userId);
    void this.channel.untrack();
    void supabase.removeChannel(this.channel);
    this.emitLocal("disconnect");
  }

  private emitLocal(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`MinimalChat realtime handler failed: ${event}`, error);
      }
    });
  }
}

export function createChatSocket(userId: string) {
  return new SupabaseChatSocket(userId);
}

export type ChatSocket = ReturnType<typeof createChatSocket>;

export type SocketEvents = {
  receive: (message: MessageDTO) => void;
  online: (payload: OnlineUsersDTO) => void;
  offline: (payload: OnlineUsersDTO) => void;
};

export async function sendSocketMessage(socket: ChatSocket | null, payload: SendMessageDTO) {
  if (!socket?.connected) {
    return { ok: false, error: "Realtime is unavailable. Message was not sent.", code: "SERVER_UNAVAILABLE" };
  }

  try {
    const result = await api.sendMessage(payload);
    return { ok: true, message: result.message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not send message.",
      code: "SEND_FAILED"
    };
  }
}
