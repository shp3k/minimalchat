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
    };
    minimalChatClipboard?: {
      readText: () => Promise<string>;
      writeText: (value: string) => Promise<void>;
    };
  }
}
