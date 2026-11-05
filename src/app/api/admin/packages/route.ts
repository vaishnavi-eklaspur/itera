import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { packageFormSchema } from "@/lib/validations";

export async function GET() {
  const packages = await db.package.findMany({
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true } },
      _count: { select: { enquiries: true, versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = packageFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const existing = await db.package.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "A package with this URL slug already exists" }, { status: 409 });
  }

  const pkg = await db.package.create({
    data: {
      slug: data.slug,
      status: "DRAFT",
    },
  });

  const version = await db.packageVersion.create({
    data: {
      packageId: pkg.id,
      versionNumber: 1,
      title: data.title,
      destination: data.destination,
      days: data.days,
      description: data.description,
      inclusions: data.inclusions,
      exclusions: data.exclusions,
      hotelTier: data.hotelTier,
      itinerary: data.itinerary,
      photos: data.photos,
      mapCenter: data.mapCenter || null,
      authorId: session.user.id,
    },
  });

  await db.package.update({
    where: { id: pkg.id },
    data: { currentVersionId: version.id },
  });

  for (const price of data.seasonalPrices) {
    await db.seasonalPrice.create({
      data: {
        packageId: pkg.id,
        seasonName: price.seasonName,
        seasonStartMonth: price.seasonStartMonth,
        seasonEndMonth: price.seasonEndMonth,
        pricePerPerson: price.pricePerPerson,
        basis: price.basis,
        gstInclusive: price.gstInclusive,
      },
    });
  }

  return NextResponse.json(pkg, { status: 201 });
}
