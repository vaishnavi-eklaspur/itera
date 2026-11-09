import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { seasonalPricesSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id } = await params;

  const versions = await db.packageVersion.findMany({
    where: { packageId: id },
    include: { author: { select: { name: true } } },
    orderBy: { versionNumber: "desc" },
  });

  return NextResponse.json(versions);
}

// Restore a version
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const { versionId } = await req.json();

  const sourceVersion = await db.packageVersion.findUnique({
    where: { id: versionId },
    include: { package: { include: { seasonalPrices: { where: { isActive: true } } } } },
  });
  if (!sourceVersion || sourceVersion.packageId !== id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const sourcePrices = sourceVersion.seasonalPrices === null
    ? sourceVersion.package.seasonalPrices.map((price) => ({
        seasonName: price.seasonName,
        seasonStartMonth: price.seasonStartMonth,
        seasonEndMonth: price.seasonEndMonth,
        pricePerPerson: price.pricePerPerson,
        basis: price.basis,
        gstInclusive: price.gstInclusive,
      }))
    : sourceVersion.seasonalPrices;
  const parsedPrices = seasonalPricesSchema.safeParse(sourcePrices);
  if (!parsedPrices.success) {
    return NextResponse.json({ error: "Saved version pricing is invalid and cannot be restored." }, { status: 500 });
  }

  const latest = await db.packageVersion.findFirst({
    where: { packageId: id },
    orderBy: { versionNumber: "desc" },
  });

  const nextVersion = (latest?.versionNumber || 0) + 1;

  const restored = await db.$transaction(async (tx) => {
    const v = await tx.packageVersion.create({
      data: {
        packageId: id,
        versionNumber: nextVersion,
        title: sourceVersion.title,
        destination: sourceVersion.destination,
        days: sourceVersion.days,
        description: sourceVersion.description,
        inclusions: sourceVersion.inclusions,
        exclusions: sourceVersion.exclusions,
        hotelTier: sourceVersion.hotelTier,
        hotelNames: sourceVersion.hotelNames,
        itinerary: sourceVersion.itinerary as object,
        photos: sourceVersion.photos,
        photoAltTexts: sourceVersion.photoAltTexts,
        seasonalPrices: parsedPrices.data,
        mapCenter: sourceVersion.mapCenter as object,
        authorId: session.user.id,
      },
    });

    await tx.package.update({
      where: { id },
      data: {
        currentVersionId: v.id,
        scheduledAt: null,
      },
    });
    await tx.seasonalPrice.deleteMany({ where: { packageId: id } });
    await tx.seasonalPrice.createMany({
      data: parsedPrices.data.map((price) => ({
        packageId: id,
        seasonName: price.seasonName,
        seasonStartMonth: price.seasonStartMonth,
        seasonEndMonth: price.seasonEndMonth,
        pricePerPerson: price.pricePerPerson,
        basis: price.basis,
        gstInclusive: price.gstInclusive,
      })),
    });

    return v;
  });

  revalidatePath("/");
  revalidatePath("/packages");
  revalidatePath(`/packages/${sourceVersion.package.slug}`);
  return NextResponse.json({ success: true, versionNumber: restored.versionNumber });
}
