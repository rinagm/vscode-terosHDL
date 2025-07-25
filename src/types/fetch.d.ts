// Minimal type definitions for axios compatibility
// This provides RequestInit without conflicting with Node.js types

declare global {
  interface RequestInit {
    method?: string;
    headers?: Record<string, string> | Headers;
    body?: string | Buffer | Uint8Array;
    signal?: AbortSignal | null;
    [key: string]: any;
  }

  interface Headers {
    [key: string]: any;
  }
}

export {};
