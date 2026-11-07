import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatPrice, slugify, getSeasonForMonth, timeAgo, responseTimeBadge } from "../src/lib/utils";

describe("formatPrice", () => {
  it("formats INR with Indian grouping", () => {
    expect(formatPrice(16500)).toMatch(/16,500/);
  });

  it("formats large amounts", () => {
    expect(formatPrice(150000)).toMatch(/1,50,000/);
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toMatch(/0/);
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Kochi Alleppey Weekend")).toBe("kochi-alleppey-weekend");
  });

  it("strips special characters", () => {
    expect(slugify("Munnar & Thekkady!")).toBe("munnar-thekkady");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("a   b---c")).toBe("a-b-c");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("getSeasonForMonth", () => {
  const prices = [
    { seasonStartMonth: 10, seasonEndMonth: 2, seasonName: "Peak", pricePerPerson: 35000 },
    { seasonStartMonth: 3, seasonEndMonth: 5, seasonName: "Shoulder", pricePerPerson: 25000 },
    { seasonStartMonth: 6, seasonEndMonth: 9, seasonName: "Monsoon", pricePerPerson: 18000 },
  ];

  it("finds peak season (wraps around year)", () => {
    expect(getSeasonForMonth(12, prices)?.seasonName).toBe("Peak");
    expect(getSeasonForMonth(1, prices)?.seasonName).toBe("Peak");
  });

  it("finds shoulder season", () => {
    expect(getSeasonForMonth(4, prices)?.seasonName).toBe("Shoulder");
  });

  it("finds monsoon season", () => {
    expect(getSeasonForMonth(7, prices)?.seasonName).toBe("Monsoon");
  });

  it("returns undefined for unmatched month", () => {
    const partial = [{ seasonStartMonth: 1, seasonEndMonth: 3, seasonName: "Q1", pricePerPerson: 20000 }];
    expect(getSeasonForMonth(6, partial)).toBeUndefined();
  });
});

describe("timeAgo", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns 'Just now' for < 1 minute", () => {
    const now = new Date();
    vi.setSystemTime(now);
    expect(timeAgo(new Date(now.getTime() - 30_000))).toBe("Just now");
  });

  it("returns minutes", () => {
    const now = new Date();
    vi.setSystemTime(now);
    expect(timeAgo(new Date(now.getTime() - 5 * 60_000))).toBe("5m ago");
  });

  it("returns hours", () => {
    const now = new Date();
    vi.setSystemTime(now);
    expect(timeAgo(new Date(now.getTime() - 3 * 3600_000))).toBe("3h ago");
  });

  it("returns days", () => {
    const now = new Date();
    vi.setSystemTime(now);
    expect(timeAgo(new Date(now.getTime() - 48 * 3600_000))).toBe("2d ago");
  });
});

describe("responseTimeBadge", () => {
  it("returns grey when already replied", () => {
    const created = new Date("2024-01-01T10:00:00Z");
    const replied = new Date("2024-01-01T10:45:00Z");
    const badge = responseTimeBadge(created, replied);
    expect(badge.color).toBe("grey");
    expect(badge.label).toContain("45m");
  });

  it("returns green for waiting < 30m", () => {
    const created = new Date(Date.now() - 15 * 60_000);
    const badge = responseTimeBadge(created);
    expect(badge.color).toBe("green");
  });

  it("returns red for waiting > 60m", () => {
    const created = new Date(Date.now() - 90 * 60_000);
    const badge = responseTimeBadge(created);
    expect(badge.color).toBe("red");
  });
});
