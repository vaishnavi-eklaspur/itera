import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination");
  const minDays = searchParams.get("minDays");
  const maxDays = searchParams.get("maxDays");
  const maxBudget = searchParams.get("maxBudget");
  const hotelTier = searchParams.get("hotelTier");
  const sort = searchParams.get("sort") || "price-asc";
  const q = searchParams.get("q");

  const packages = await db.package.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        ...(destination ? [{ currentVersion: { destination: { contains: destination, mode: "insensitive" as const } } }] : []),
        ...(minDays ? [{ currentVersion: { days: { gte: parseInt(minDays, 10) } } }] : []),
        ...(maxDays ? [{ currentVersion: { days: { lte: parseInt(maxDays, 10) } } }] : []),
        ...(hotelTier ? [{ currentVersion: { hotelTier: { contains: hotelTier, mode: "insensitive" as const } } }] : []),
        ...(q ? [{
          currentVersion: {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { destination: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }] : []),
      ],
    },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true } },
      _count: { select: { enquiries: true } },
    },
  });

  let filtered = packages;

  if (maxBudget) {
    const budget = parseInt(maxBudget);
    filtered = filtered.filter((pkg) =>
      pkg.seasonalPrices.some((p) => p.pricePerPerson <= budget)
    );
  }

  filtered.sort((a, b) => {
    const aMin = Math.min(...a.seasonalPrices.map((p) => p.pricePerPerson));
    const bMin = Math.min(...b.seasonalPrices.map((p) => p.pricePerPerson));
    switch (sort) {
      case "price-desc": return bMin - aMin;
      case "days-asc": return (a.currentVersion?.days || 0) - (b.currentVersion?.days || 0);
      case "days-desc": return (b.currentVersion?.days || 0) - (a.currentVersion?.days || 0);
      case "popular": return (b._count.enquiries || 0) - (a._count.enquiries || 0);
      default: return aMin - bMin;
    }
  });

  const response = NextResponse.json(filtered);
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return response;
}
