import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeRole } from "@/lib/roles";
import { packageFormSchema } from "@/lib/validations";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id } = await params;
  const pkg = await db.package.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true } },
    },
  });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  if (!pkg.currentVersion) {
    return NextResponse.json({ error: "This package has no saved version to preview." }, { status: 400 });
  }

  const version = pkg.currentVersion;
  const parsed = packageFormSchema.safeParse({
    title: version.title,
    slug: pkg.slug,
    destination: version.destination,
    days: version.days,
    description: version.description,
    inclusions: version.inclusions,
    exclusions: version.exclusions,
    hotelTier: version.hotelTier,
    hotelNames: version.hotelNames,
    itinerary: version.itinerary,
    photos: version.photos,
    photoAltTexts: version.photoAltTexts,
    mapCenter: version.mapCenter ?? undefined,
    seasonalPrices: pkg.seasonalPrices.map((price) => ({
      seasonName: price.seasonName,
      seasonStartMonth: price.seasonStartMonth,
      seasonEndMonth: price.seasonEndMonth,
      pricePerPerson: price.pricePerPerson,
      basis: price.basis,
      gstInclusive: price.gstInclusive,
    })),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Saved package data is invalid and cannot be previewed." }, { status: 500 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.previewCache.create({
    data: {
      token,
      data: { ...parsed.data, days: parsed.data.itinerary.length } as object,
      expiresAt,
    },
  });

  return NextResponse.json({ token });
}
