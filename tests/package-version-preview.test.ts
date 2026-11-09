import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authorizeRole: vi.fn(),
  packageVersionFindFirst: vi.fn(),
  previewCacheCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/roles", () => ({ authorizeRole: mocks.authorizeRole }));
vi.mock("@/lib/db", () => ({
  db: {
    packageVersion: { findFirst: mocks.packageVersionFindFirst },
    previewCache: { create: mocks.previewCacheCreate },
  },
}));

import { GET } from "../src/app/api/admin/packages/[id]/versions/[versionId]/preview/route";

const version = {
  id: "version-2",
  packageId: "package-1",
  versionNumber: 2,
  title: "Older Kerala Tour",
  destination: "Kerala",
  days: 1,
  description: "Historical package version for a saved preview.",
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
  photos: ["https://example.com/kochi.jpg"],
  photoAltTexts: ["Chinese fishing nets at sunset"],
  seasonalPrices: [{
    seasonName: "Historical Peak",
    seasonStartMonth: 12,
    seasonEndMonth: 2,
    pricePerPerson: 28000,
    basis: "Per person, twin sharing",
    gstInclusive: true,
  }],
  mapCenter: null,
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  package: {
    slug: "kerala-tour",
    seasonalPrices: [{
      seasonName: "Peak",
      seasonStartMonth: 12,
      seasonEndMonth: 2,
      pricePerPerson: 30000,
      basis: "Per person, single",
      gstInclusive: false,
      isActive: true,
    }],
  },
};

describe("saved package version preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.authorizeRole.mockReturnValue(null);
    mocks.packageVersionFindFirst.mockResolvedValue(version);
    mocks.previewCacheCreate.mockResolvedValue({});
  });

  it("previews the selected version without changing the live package", async () => {
    const response = await GET(new NextRequest("https://itera.example/api/preview"), {
      params: Promise.resolve({ id: "package-1", versionId: "version-2" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toMatch(/\/packages\/preview\/.+/);
    expect(mocks.packageVersionFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "version-2", packageId: "package-1" },
    }));
    expect(mocks.previewCacheCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        data: expect.objectContaining({
          title: "Older Kerala Tour",
          hotelNames: ["Tea Valley Resort"],
          photoAltTexts: ["Chinese fishing nets at sunset"],
          versionPreview: {
            versionNumber: 2,
            createdAt: version.createdAt.toISOString(),
            pricingSnapshotAvailable: true,
          },
          seasonalPrices: [{
            seasonName: "Historical Peak",
            seasonStartMonth: 12,
            seasonEndMonth: 2,
            pricePerPerson: 28000,
            basis: "Per person, twin sharing",
            gstInclusive: true,
          }],
        }),
      }),
    });
  });

  it("uses current prices and flags versions created before pricing snapshots existed", async () => {
    mocks.packageVersionFindFirst.mockResolvedValue({
      ...version,
      seasonalPrices: null,
    });

    await GET(new NextRequest("https://itera.example/api/preview"), {
      params: Promise.resolve({ id: "package-1", versionId: "version-2" }),
    });

    expect(mocks.previewCacheCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        data: expect.objectContaining({
          versionPreview: expect.objectContaining({ pricingSnapshotAvailable: false }),
          seasonalPrices: [expect.objectContaining({
            seasonName: "Peak",
            pricePerPerson: 30000,
          })],
        }),
      }),
    }));
  });

  it("does not preview a version that belongs to another package or does not exist", async () => {
    mocks.packageVersionFindFirst.mockResolvedValue(null);

    const response = await GET(new NextRequest("https://itera.example/api/preview"), {
      params: Promise.resolve({ id: "package-1", versionId: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.previewCacheCreate).not.toHaveBeenCalled();
  });
});
