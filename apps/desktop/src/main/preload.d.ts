export {};

type MinimalChatUpdateStatus =
  | { state: "checking" }
  | { state: "available"; version?: string }
  | { state: "not-available" }
  | { state: "downloading"; percent?: number; transferred?: number; total?: number }
  | { state: "downloaded"; version?: string }
  | { state: "error"; message?: string };

declare global {
  interface Window {
    minimalChatWindow?: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
    minimalChatApp?: {
      openExternal: (url: string) => Promise<void>;
      setUnreadCount: (count: number) => Promise<void>;
    };
    minimalChatClipboard?: {
      readText: () => Promise<string>;
      writeText: (value: string) => Promise<void>;
    };
    minimalChatNotifications?: {
      showMessage: (payload: {
        title: string;
        body: string;
        senderId: string;
        force?: boolean;
      }) => Promise<boolean>;
      onMessageClick: (callback: (payload: { senderId: string }) => void) => () => void;
    };
    minimalChatUpdates?: {
      check: () => Promise<{ ok: boolean; code?: string }>;
      install: () => Promise<void>;
      onStatus: (handler: (status: MinimalChatUpdateStatus) => void) => () => void;
    };
  }
}
