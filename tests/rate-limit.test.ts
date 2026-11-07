import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit, getClientIp } from "../src/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", () => {
    const key = "test-under-" + Math.random();
    expect(rateLimit(key, 60_000, 3)).toBe(true);
    expect(rateLimit(key, 60_000, 3)).toBe(true);
    expect(rateLimit(key, 60_000, 3)).toBe(true);
  });

  it("blocks requests at the limit", () => {
    const key = "test-at-" + Math.random();
    for (let i = 0; i < 5; i++) rateLimit(key, 60_000, 5);
    expect(rateLimit(key, 60_000, 5)).toBe(false);
  });

  it("resets after the time window", () => {
    const key = "test-reset-" + Math.random();
    for (let i = 0; i < 5; i++) rateLimit(key, 1000, 5);
    expect(rateLimit(key, 1000, 5)).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(rateLimit(key, 1000, 5)).toBe(true);
  });

  it("isolates different keys", () => {
    const a = "key-a-" + Math.random();
    const b = "key-b-" + Math.random();
    for (let i = 0; i < 5; i++) rateLimit(a, 60_000, 5);
    expect(rateLimit(a, 60_000, 5)).toBe(false);
    expect(rateLimit(b, 60_000, 5)).toBe(true);
  });

  it("uses default params (60s window, max 5)", () => {
    const key = "test-defaults-" + Math.random();
    for (let i = 0; i < 5; i++) expect(rateLimit(key)).toBe(true);
    expect(rateLimit(key)).toBe(false);
  });
});

function mockReq(headers: Record<string, string>) {
  return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } };
}

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    expect(getClientIp(mockReq({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))).toBe("1.2.3.4");
  });

  it("uses rightmost x-forwarded-for when no x-real-ip", () => {
    expect(getClientIp(mockReq({ "x-forwarded-for": "spoofed, 10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("returns unknown when no headers", () => {
    expect(getClientIp(mockReq({}))).toBe("unknown");
  });

  it("resists x-forwarded-for spoofing (ignores client-prepended value)", () => {
    expect(getClientIp(mockReq({ "x-forwarded-for": "attacker-spoofed, real-proxy-ip" }))).toBe("real-proxy-ip");
  });
});
