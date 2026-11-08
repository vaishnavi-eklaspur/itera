import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const source = await db.package.findUnique({
    where: { id },
    include: { currentVersion: true, seasonalPrices: true },
  });

  if (!source?.currentVersion) {
    return NextResponse.json({ error: "Source package not found" }, { status: 404 });
  }

  const v = source.currentVersion;
  const newSlug = `${source.slug}-copy-${Date.now().toString(36)}`;

  const pkg = await db.$transaction(async (tx) => {
    const p = await tx.package.create({ data: { slug: newSlug, status: "DRAFT" } });

    const version = await tx.packageVersion.create({
      data: {
        packageId: p.id,
        versionNumber: 1,
        title: `${v.title} (Copy)`,
        destination: v.destination,
        days: v.days,
        description: v.description,
        inclusions: v.inclusions,
        exclusions: v.exclusions,
        hotelTier: v.hotelTier,
        itinerary: v.itinerary as object,
        photos: v.photos,
        mapCenter: v.mapCenter as object,
        authorId: session.user.id,
      },
    });

    await tx.package.update({ where: { id: p.id }, data: { currentVersionId: version.id } });

    await tx.seasonalPrice.createMany({
      data: source.seasonalPrices.map((price) => ({
        packageId: p.id,
        seasonName: price.seasonName,
        seasonStartMonth: price.seasonStartMonth,
        seasonEndMonth: price.seasonEndMonth,
        pricePerPerson: price.pricePerPerson,
        basis: price.basis,
        gstInclusive: price.gstInclusive,
      })),
    });

    return p;
  });

  return NextResponse.json(pkg, { status: 201 });
}
