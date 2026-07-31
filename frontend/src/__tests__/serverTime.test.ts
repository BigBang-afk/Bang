import { beforeEach, describe, expect, it, vi } from "vitest";

import { useServerTimeStore } from "@/store/serverTime";

describe("useServerTimeStore", () => {
  beforeEach(() => {
    useServerTimeStore.setState({ offsetMs: 0, synced: false });
  });

  it("computes the offset between server time and the local clock", () => {
    const localNow = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(localNow);

    // Server is 5 seconds ahead of this browser's clock.
    const serverTimeIso = new Date(localNow + 5000).toISOString();
    useServerTimeStore.getState().setServerTime(serverTimeIso);

    expect(useServerTimeStore.getState().offsetMs).toBe(5000);
    expect(useServerTimeStore.getState().synced).toBe(true);

    vi.restoreAllMocks();
  });

  it("getServerNow applies the stored offset to the local clock", () => {
    const localNow = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(localNow);
    useServerTimeStore.setState({ offsetMs: 2000, synced: true });

    expect(useServerTimeStore.getState().getServerNow()).toBe(localNow + 2000);

    vi.restoreAllMocks();
  });
});
