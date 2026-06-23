export {};

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
  }
}
