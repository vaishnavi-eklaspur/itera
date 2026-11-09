import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authorizeRole: vi.fn(),
  packageVersionFindUnique: vi.fn(),
  packageVersionFindFirst: vi.fn(),
  packageVersionCreate: vi.fn(),
  packageUpdate: vi.fn(),
  seasonalPriceDeleteMany: vi.fn(),
  seasonalPriceCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/roles", () => ({ authorizeRole: mocks.authorizeRole }));
vi.mock("@/lib/db", () => ({
  db: {
    packageVersion: {
      findUnique: mocks.packageVersionFindUnique,
      findFirst: mocks.packageVersionFindFirst,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST } from "../src/app/api/admin/packages/[id]/versions/route";

const historicalPrices = [{
  seasonName: "Historical Peak",
  seasonStartMonth: 12,
  seasonEndMonth: 2,
  pricePerPerson: 28000,
  basis: "Per person, twin sharing",
  gstInclusive: true,
}];

describe("package version restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.authorizeRole.mockReturnValue(null);
    mocks.packageVersionFindUnique.mockResolvedValue({
      id: "version-2",
      packageId: "package-1",
      versionNumber: 2,
      title: "Older Kerala Tour",
      destination: "Kerala",
      days: 1,
      description: "A historical description.",
      inclusions: ["Hotel"],
      exclusions: ["Flights"],
      hotelTier: "4-Star",
      hotelNames: ["Tea Valley Resort"],
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
      photoAltTexts: [],
      seasonalPrices: historicalPrices,
      mapCenter: null,
      package: { seasonalPrices: [] },
    });
    mocks.packageVersionFindFirst.mockResolvedValue({ versionNumber: 3 });
    mocks.packageVersionCreate.mockResolvedValue({ id: "version-4", versionNumber: 4 });
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
  });

  it("stages the restored version and its pricing as a draft without changing live content", async () => {
    const response = await POST(new NextRequest("https://itera.example/api/versions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId: "version-2" }),
    }), { params: Promise.resolve({ id: "package-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.packageVersionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ seasonalPrices: historicalPrices }),
    });
    expect(mocks.seasonalPriceDeleteMany).toHaveBeenCalledWith({
      where: { packageId: "package-1", isActive: false },
    });
    expect(mocks.seasonalPriceCreateMany).toHaveBeenCalledWith({
      data: historicalPrices.map((price) => ({ ...price, packageId: "package-1", isActive: false })),
    });
    expect(mocks.packageUpdate).toHaveBeenCalledWith({
      where: { id: "package-1" },
      data: { draftVersionId: "version-4", scheduledAt: null },
    });
  });
});
