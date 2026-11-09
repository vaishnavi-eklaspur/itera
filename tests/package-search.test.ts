import { describe, expect, it } from "vitest";
import { activeSeasonalPriceWhere, buildPackageWhere } from "../src/lib/package-search";

describe("package search filters", () => {
  it("combines text, destination, duration, hotel, season, and budget filters", () => {
    const where = buildPackageWhere({
      q: "houseboat",
      destination: "Kerala",
      minDays: "5",
      maxDays: "8",
      maxBudget: "50000",
      hotelTier: "4 Star",
      season: "Peak Season",
    });

    expect(where).toMatchObject({
      status: "PUBLISHED",
      currentVersion: {
        destination: { contains: "Kerala", mode: "insensitive" },
        OR: [
          { title: { contains: "houseboat", mode: "insensitive" } },
          { destination: { contains: "houseboat", mode: "insensitive" } },
          { description: { contains: "houseboat", mode: "insensitive" } },
        ],
        days: { gte: 5, lte: 8 },
        hotelTier: { equals: "4 Star", mode: "insensitive" },
      },
      seasonalPrices: {
        some: {
          isActive: true,
          seasonName: { equals: "Peak Season", mode: "insensitive" },
          pricePerPerson: { lte: 50000 },
        },
      },
    });
  });

  it("uses the same seasonal-price row to satisfy season and budget", () => {
    const where = buildPackageWhere({ season: "Monsoon", maxBudget: "30000" });

    expect(where.seasonalPrices).toEqual({
      some: {
        isActive: true,
        seasonName: { equals: "Monsoon", mode: "insensitive" },
        pricePerPerson: { lte: 30000 },
      },
    });
  });

  it("filters returned prices to the selected season and budget", () => {
    expect(activeSeasonalPriceWhere({ season: "Summer", maxBudget: "40000" })).toEqual({
      isActive: true,
      seasonName: { equals: "Summer", mode: "insensitive" },
      pricePerPerson: { lte: 40000 },
    });
  });

  it("ignores malformed and out-of-range numeric query values", () => {
    const where = buildPackageWhere({
      minDays: "0",
      maxDays: "31",
      maxBudget: "-1",
    });

    expect(where.status).toBe("PUBLISHED");
    expect(where.currentVersion).toBeUndefined();
    expect(where.seasonalPrices).toEqual({ some: { isActive: true } });
  });

  it("does not include packages that lack an active seasonal price", () => {
    expect(buildPackageWhere({}).seasonalPrices).toEqual({ some: { isActive: true } });
  });
});
