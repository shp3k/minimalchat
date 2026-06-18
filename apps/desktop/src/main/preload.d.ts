export {};

declare global {
  interface Window {
    minimalChatWindow?: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
  }
}
