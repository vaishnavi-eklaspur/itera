import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  authorizeRole: vi.fn(),
  packageFindUnique: vi.fn(),
  previewCacheCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/roles", () => ({ authorizeRole: mocks.authorizeRole }));
vi.mock("@/lib/db", () => ({
  db: {
    package: { findUnique: mocks.packageFindUnique },
    previewCache: { create: mocks.previewCacheCreate },
  },
}));

import { POST } from "../src/app/api/admin/packages/[id]/preview/route";

const savedPackage = {
  id: "package-1",
  slug: "kerala-tour",
  currentVersion: {
    title: "Kerala Tour",
    destination: "Kerala",
    days: 1,
    description: "A saved package description for preview.",
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
    mapCenter: null,
  },
  seasonalPrices: [{
    seasonName: "Peak",
    seasonStartMonth: 12,
    seasonEndMonth: 2,
    pricePerPerson: 30000,
    basis: "Per person, twin sharing",
    gstInclusive: true,
    isActive: true,
  }],
};

describe("saved package preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.authorizeRole.mockReturnValue(null);
    mocks.packageFindUnique.mockResolvedValue(savedPackage);
    mocks.previewCacheCreate.mockResolvedValue({});
  });

  it("creates a preview from saved live content and active prices", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "package-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toEqual(expect.any(String));
    expect(mocks.previewCacheCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: body.token,
        data: expect.objectContaining({
          title: "Kerala Tour",
          slug: "kerala-tour",
          days: 1,
          hotelNames: ["Tea Valley Resort"],
          seasonalPrices: [{ ...savedPackage.seasonalPrices[0], isActive: undefined }],
        }),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("requires an authenticated staff user", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "package-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.packageFindUnique).not.toHaveBeenCalled();
  });

  it("returns not found when the package does not exist", async () => {
    mocks.packageFindUnique.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.previewCacheCreate).not.toHaveBeenCalled();
  });
});
