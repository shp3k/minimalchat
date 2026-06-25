export {};

type MinimalChatUpdateStatus =
  | { state: "checking" }
  | { state: "available"; version?: string }
  | { state: "not-available" }
  | { state: "downloading"; percent?: number; transferred?: number; total?: number }
  | { state: "downloaded"; version?: string }
  | { state: "installing"; version?: string }
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
      getVersion: () => Promise<string>;
      setUnreadCount: (count: number) => Promise<void>;
    };
    minimalChatClipboard?: {
      readText: () => Promise<string>;
      readImage: () => Promise<{ ok: boolean; dataUrl?: string; size?: number; code?: string }>;
      writeText: (value: string) => Promise<void>;
      writeImage: (url: string) => Promise<{ ok: boolean; code?: string }>;
    };
    minimalChatLinkPreview?: {
      fetch: (url: string) => Promise<{
        ok: boolean;
        code?: string;
        url?: string;
        title?: string;
        description?: string;
        siteName?: string;
        imageDataUrl?: string | null;
      }>;
    };
    minimalChatNotifications?: {
      showMessage: (payload: {
        title: string;
        body: string;
        senderId: string;
        force?: boolean;
        silent?: boolean;
      }) => Promise<boolean>;
      onMessageClick: (callback: (payload: { senderId: string }) => void) => () => void;
    };
    minimalChatUpdates?: {
      check: () => Promise<{ ok: boolean; code?: string }>;
      install: () => Promise<{ ok: boolean; code?: string }>;
      onStatus: (handler: (status: MinimalChatUpdateStatus) => void) => () => void;
    };
  }
}
