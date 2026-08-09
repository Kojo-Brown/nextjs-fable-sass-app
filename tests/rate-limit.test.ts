import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIp = vi.hoisted(() => ({ value: "1.2.3.4" }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": mockIp.value }),
}));

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Each test gets its own scope so windows don't bleed between tests.
    mockIp.value = `10.0.0.${Math.floor(Math.random() * 250)}`;
  });

  it("allows requests under the limit", async () => {
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit("test-a", 3, 60_000);
      expect(result.ok).toBe(true);
    }
  });

  it("blocks requests over the limit with a retry hint", async () => {
    for (let i = 0; i < 2; i++) await rateLimit("test-b", 2, 60_000);
    const blocked = await rateLimit("test-b", 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks different IPs independently", async () => {
    mockIp.value = "203.0.113.1";
    await rateLimit("test-c", 1, 60_000);
    const sameIp = await rateLimit("test-c", 1, 60_000);
    expect(sameIp.ok).toBe(false);

    mockIp.value = "203.0.113.2";
    const otherIp = await rateLimit("test-c", 1, 60_000);
    expect(otherIp.ok).toBe(true);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    try {
      await rateLimit("test-d", 1, 1000);
      expect((await rateLimit("test-d", 1, 1000)).ok).toBe(false);
      vi.advanceTimersByTime(1500);
      expect((await rateLimit("test-d", 1, 1000)).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
