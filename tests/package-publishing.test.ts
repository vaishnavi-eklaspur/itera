import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  packageFindUnique: vi.fn(),
  packageUpdateMany: vi.fn(),
  seasonalPriceDeleteMany: vi.fn(),
  seasonalPriceUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { $transaction: mocks.transaction },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { publishPackageNow } from "../src/lib/package-publishing";

const scheduledPrices = [{
  seasonName: "Peak",
  seasonStartMonth: 12,
  seasonEndMonth: 2,
  pricePerPerson: 30000,
  basis: "Per person, twin sharing",
  gstInclusive: true,
}];

describe("scheduled package publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.packageFindUnique.mockResolvedValue({
      id: "package-1",
      slug: "kerala-tour",
      currentVersionId: "live-version",
      scheduledAt: new Date("2026-11-09T10:00:00.000Z"),
      versions: [{ id: "scheduled-version" }],
      seasonalPrices: scheduledPrices.map((price, index) => ({ ...price, id: `price-${index}`, isActive: false })),
    });
    mocks.packageUpdateMany.mockResolvedValue({ count: 1 });
    mocks.seasonalPriceDeleteMany.mockResolvedValue({});
    mocks.seasonalPriceUpdateMany.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({
      package: {
        findUnique: mocks.packageFindUnique,
        updateMany: mocks.packageUpdateMany,
      },
      seasonalPrice: {
        deleteMany: mocks.seasonalPriceDeleteMany,
        updateMany: mocks.seasonalPriceUpdateMany,
      },
    }));
  });

  it("atomically activates the staged version and its seasonal prices", async () => {
    const result = await publishPackageNow("package-1", new Date("2026-11-09T11:00:00.000Z"));

    expect(result).toEqual({ slug: "kerala-tour" });
    expect(mocks.packageUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currentVersionId: "scheduled-version",
        status: "PUBLISHED",
        scheduledAt: null,
      }),
    }));
    expect(mocks.seasonalPriceDeleteMany).toHaveBeenCalledWith({
      where: { packageId: "package-1", isActive: true },
    });
    expect(mocks.seasonalPriceUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["price-0"] } },
      data: { isActive: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/packages/kerala-tour");
  });

  it("does not publish a package before its scheduled time", async () => {
    const result = await publishPackageNow("package-1", new Date("2026-11-09T09:00:00.000Z"));

    expect(result).toBeNull();
    expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
    expect(mocks.seasonalPriceDeleteMany).not.toHaveBeenCalled();
  });

  it("rejects invalid staged pricing instead of publishing a partial update", async () => {
    mocks.packageFindUnique.mockResolvedValue({
      id: "package-1",
      slug: "kerala-tour",
      currentVersionId: "live-version",
      scheduledAt: new Date("2026-11-09T10:00:00.000Z"),
      versions: [{ id: "scheduled-version" }],
      seasonalPrices: [{ id: "staged-price", isActive: false, seasonName: "", pricePerPerson: -1 }],
    });

    await expect(publishPackageNow("package-1")).rejects.toThrow("Scheduled prices");
    expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
    expect(mocks.seasonalPriceDeleteMany).not.toHaveBeenCalled();
  });
});
