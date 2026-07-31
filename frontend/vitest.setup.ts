import "@testing-library/jest-dom/vitest";

// jsdom does not implement WebSocket. Components that open live connections
// (chart, countdown, signal feeds) get a harmless stub so they can render in
// tests without needing a real backend.
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {}
  close(): void {
    this.onclose?.();
  }
  send(): void {}
}

// @ts-expect-error - partial stub is sufficient for component rendering tests
global.WebSocket = MockWebSocket;
