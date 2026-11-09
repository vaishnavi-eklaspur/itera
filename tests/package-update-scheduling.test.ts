import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  packageFindUnique: vi.fn(),
  packageVersionCreate: vi.fn(),
  packageUpdate: vi.fn(),
  seasonalPriceDeleteMany: vi.fn(),
  seasonalPriceCreateMany: vi.fn(),
  transaction: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    package: { findUnique: mocks.packageFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/activity", () => ({ logActivity: mocks.logActivity }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { PUT } from "../src/app/api/admin/packages/[id]/route";

const packageInput = {
  title: "Updated Kerala Tour",
  slug: "kerala-tour",
  destination: "Kerala",
  days: 1,
  description: "An updated package description for testing.",
  inclusions: ["Hotel"],
  exclusions: ["Flights"],
  hotelTier: "4-Star",
  itinerary: [{
    day: 1,
    title: "Arrive in Kochi",
    location: "Kochi",
    lat: 9.9312,
    lng: 76.2673,
    description: "Explore the city.",
    activities: [],
  }],
  photos: [],
  seasonalPrices: [{
    seasonName: "Peak",
    seasonStartMonth: 12,
    seasonEndMonth: 2,
    pricePerPerson: 30000,
    basis: "Per person, twin sharing",
    gstInclusive: true,
  }],
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/packages/package-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("package edit scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.packageFindUnique.mockResolvedValue({
      id: "package-1",
      slug: "kerala-tour",
      status: "PUBLISHED",
      currentVersionId: "live-version",
      versions: [{ versionNumber: 3 }],
    });
    mocks.packageVersionCreate.mockResolvedValue({ id: "new-version" });
    mocks.packageUpdate.mockResolvedValue({});
    mocks.seasonalPriceDeleteMany.mockResolvedValue({});
    mocks.seasonalPriceCreateMany.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({
      packageVersion: { create: mocks.packageVersionCreate },
      package: { update: mocks.packageUpdate },
      seasonalPrice: {
        deleteMany: mocks.seasonalPriceDeleteMany,
        createMany: mocks.seasonalPriceCreateMany,
      },
    }));
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("stages content and prices without changing the live published package", async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const response = await PUT(request({ ...packageInput, scheduledAt }), {
      params: Promise.resolve({ id: "package-1" }),
    });
    const updateData = mocks.packageUpdate.mock.calls[0][0].data;

    expect(response.status).toBe(200);
    expect(mocks.packageVersionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ seasonalPrices: packageInput.seasonalPrices }),
    }));
    expect(updateData).toMatchObject({
      scheduledAt: new Date(scheduledAt),
    });
    expect(updateData).not.toHaveProperty("currentVersionId");
    expect(mocks.seasonalPriceDeleteMany).toHaveBeenCalledWith({
      where: { packageId: "package-1", isActive: false },
    });
    expect(mocks.seasonalPriceCreateMany).toHaveBeenCalledWith({
      data: packageInput.seasonalPrices.map((price) => ({ ...price, packageId: "package-1", isActive: false })),
    });
  });

  it("publishes edits immediately and clears a previous schedule when no future time is set", async () => {
    const response = await PUT(request(packageInput), {
      params: Promise.resolve({ id: "package-1" }),
    });
    const updateData = mocks.packageUpdate.mock.calls[0][0].data;

    expect(response.status).toBe(200);
    expect(updateData).toMatchObject({
      currentVersionId: "new-version",
      scheduledAt: null,
    });
    expect(mocks.seasonalPriceDeleteMany).toHaveBeenCalledWith({ where: { packageId: "package-1" } });
    expect(mocks.seasonalPriceCreateMany).toHaveBeenCalledOnce();
  });

  it("rejects a scheduled time in the past without writing a version", async () => {
    const response = await PUT(request({
      ...packageInput,
      scheduledAt: new Date(Date.now() - 60 * 1000).toISOString(),
    }), {
      params: Promise.resolve({ id: "package-1" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects slug changes in scheduled edits so the live URL stays unchanged", async () => {
    const response = await PUT(request({
      ...packageInput,
      slug: "new-kerala-tour",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }), {
      params: Promise.resolve({ id: "package-1" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
