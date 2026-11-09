import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeRole } from "@/lib/roles";
import { packageFormSchema, seasonalPricesSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id, versionId } = await params;
  const version = await db.packageVersion.findFirst({
    where: { id: versionId, packageId: id },
    include: {
      package: {
        select: {
          slug: true,
          seasonalPrices: { where: { isActive: true } },
        },
      },
    },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const pricingSnapshotAvailable = version.seasonalPrices !== null;
  const seasonalPrices = pricingSnapshotAvailable
    ? version.seasonalPrices
    : version.package.seasonalPrices.map((price) => ({
        seasonName: price.seasonName,
        seasonStartMonth: price.seasonStartMonth,
        seasonEndMonth: price.seasonEndMonth,
        pricePerPerson: price.pricePerPerson,
        basis: price.basis,
        gstInclusive: price.gstInclusive,
      }));
  const parsedPrices = seasonalPricesSchema.safeParse(seasonalPrices);
  if (!parsedPrices.success) {
    return NextResponse.json({ error: "Saved version pricing is invalid and cannot be previewed." }, { status: 500 });
  }

  const parsed = packageFormSchema.safeParse({
    title: version.title,
    slug: version.package.slug,
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
    seasonalPrices: parsedPrices.data,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Saved version data is invalid and cannot be previewed." }, { status: 500 });
  }

  const token = randomUUID();
  await db.previewCache.create({
    data: {
      token,
      data: {
        ...parsed.data,
        days: parsed.data.itinerary.length,
        versionPreview: {
          versionNumber: version.versionNumber,
          createdAt: version.createdAt.toISOString(),
          pricingSnapshotAvailable,
        },
      } as object,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return NextResponse.redirect(new URL(`/packages/preview/${token}`, req.url));
}
