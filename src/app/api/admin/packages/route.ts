import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { packageFormSchema } from "@/lib/validations";
import { authorizeRole } from "@/lib/roles";
import { parseScheduledAt } from "@/lib/package-publishing";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const packages = await db.package.findMany({
    select: {
      id: true,
      currentVersion: { select: { title: true, destination: true, days: true } },
      seasonalPrices: { where: { isActive: true }, select: { pricePerPerson: true, seasonName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const body = await req.json();
  const parsed = packageFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const scheduledAt = parseScheduledAt(body.scheduledAt);
  if (scheduledAt === undefined) {
    return NextResponse.json({ error: "Scheduled publish time must be in the future." }, { status: 400 });
  }
  if (scheduledAt && data.seasonalPrices.length === 0) {
    return NextResponse.json({ error: "A scheduled package needs at least one seasonal price." }, { status: 400 });
  }

  const existing = await db.package.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "A package with this URL slug already exists" }, { status: 409 });
  }

  const pkg = await db.$transaction(async (tx) => {
    const p = await tx.package.create({
      data: { slug: data.slug, status: "DRAFT" },
    });

    const version = await tx.packageVersion.create({
      data: {
        packageId: p.id,
        versionNumber: 1,
        title: data.title,
        destination: data.destination,
        days: data.itinerary.length,
        description: data.description,
        inclusions: data.inclusions,
        exclusions: data.exclusions,
        hotelTier: data.hotelTier,
        hotelNames: data.hotelNames,
        itinerary: data.itinerary,
        photos: data.photos,
        photoAltTexts: data.photoAltTexts,
        seasonalPrices: data.seasonalPrices,
        mapCenter: data.mapCenter ?? undefined,
        authorId: session.user.id,
      },
    });

    await tx.package.update({
      where: { id: p.id },
      data: {
        currentVersionId: version.id,
        ...(scheduledAt ? { scheduledAt } : {}),
      },
    });

    await tx.seasonalPrice.createMany({
      data: data.seasonalPrices.map((price) => ({
        packageId: p.id,
        seasonName: price.seasonName,
        seasonStartMonth: price.seasonStartMonth,
        seasonEndMonth: price.seasonEndMonth,
        pricePerPerson: price.pricePerPerson,
        basis: price.basis,
        gstInclusive: price.gstInclusive,
        isActive: !scheduledAt,
      })),
    });

    return p;
  });

  return NextResponse.json(pkg, { status: 201 });
}
