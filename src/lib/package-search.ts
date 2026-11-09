import type { Prisma } from "@prisma/client";

export type PackageSearchFilters = {
  q?: string;
  destination?: string;
  minDays?: string;
  maxDays?: string;
  maxBudget?: string;
  hotelTier?: string;
  season?: string;
};

function parseInteger(value: string | undefined, min: number, max: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function nonEmpty(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

export function buildPackageWhere(filters: PackageSearchFilters): Prisma.PackageWhereInput {
  const query = nonEmpty(filters.q, 100);
  const destination = nonEmpty(filters.destination, 100);
  const hotelTier = nonEmpty(filters.hotelTier, 80);
  const season = nonEmpty(filters.season, 100);
  const minDays = parseInteger(filters.minDays, 1, 30);
  const maxDays = parseInteger(filters.maxDays, 1, 30);
  const maxBudget = parseInteger(filters.maxBudget, 0, 2_147_483_647);

  const versionFilters = {
    ...(destination ? { destination: { contains: destination, mode: "insensitive" as const } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { destination: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(minDays !== undefined || maxDays !== undefined
      ? { days: { ...(minDays !== undefined ? { gte: minDays } : {}), ...(maxDays !== undefined ? { lte: maxDays } : {}) } }
      : {}),
    ...(hotelTier ? { hotelTier: { equals: hotelTier, mode: "insensitive" as const } } : {}),
  };

  const seasonalPriceFilters = {
    isActive: true,
    ...(season ? { seasonName: { equals: season, mode: "insensitive" as const } } : {}),
    ...(maxBudget !== undefined ? { pricePerPerson: { lte: maxBudget } } : {}),
  };
  return {
    status: "PUBLISHED",
    ...(Object.keys(versionFilters).length > 0 ? { currentVersion: versionFilters } : {}),
    seasonalPrices: { some: seasonalPriceFilters },
  };
}

export function activeSeasonalPriceWhere(filters: PackageSearchFilters) {
  const season = nonEmpty(filters.season, 100);
  const maxBudget = parseInteger(filters.maxBudget, 0, 2_147_483_647);
  return {
    isActive: true,
    ...(season ? { seasonName: { equals: season, mode: "insensitive" as const } } : {}),
    ...(maxBudget !== undefined ? { pricePerPerson: { lte: maxBudget } } : {}),
  };
}
