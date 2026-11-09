import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { packageFormSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { authorizeRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { parseScheduledAt } from "@/lib/package-publishing";

export async function GET(
  req: NextRequest,
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
      versions: { orderBy: { versionNumber: "desc" }, include: { author: { select: { name: true } } } },
      seasonalPrices: { orderBy: { pricePerPerson: "asc" } },
      _count: { select: { enquiries: true } },
    },
  });

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...pkg,
    scheduledVersion: pkg.scheduledAt ? pkg.versions[0] ?? null : null,
    scheduledPrices: pkg.scheduledAt ? pkg.seasonalPrices.filter((price) => !price.isActive) : null,
    seasonalPrices: pkg.seasonalPrices.filter((price) => price.isActive),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const body = await req.json();
  const parsed = packageFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const pkg = await db.package.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const data = parsed.data;
  const scheduledAt = parseScheduledAt(body.scheduledAt);
  if (scheduledAt === undefined) {
    return NextResponse.json({ error: "Scheduled publish time must be in the future." }, { status: 400 });
  }
  if (scheduledAt && data.seasonalPrices.length === 0) {
    return NextResponse.json({ error: "A scheduled package needs at least one seasonal price." }, { status: 400 });
  }
  if (scheduledAt && data.slug !== pkg.slug) {
    return NextResponse.json({ error: "A package URL slug cannot be changed in a scheduled edit." }, { status: 400 });
  }
  const nextVersionNumber = (pkg.versions[0]?.versionNumber || 0) + 1;

  await db.$transaction(async (tx) => {
    const version = await tx.packageVersion.create({
      data: {
        packageId: id,
        versionNumber: nextVersionNumber,
        title: data.title,
        destination: data.destination,
        days: data.itinerary.length,
        description: data.description,
        inclusions: data.inclusions,
        exclusions: data.exclusions,
        hotelTier: data.hotelTier,
        itinerary: data.itinerary,
        photos: data.photos,
        mapCenter: data.mapCenter ?? undefined,
        authorId: session.user.id,
      },
    });

    const isScheduled = scheduledAt !== null;
    await tx.package.update({
      where: { id },
      data: {
        slug: data.slug,
        scheduledAt,
        ...(!isScheduled ? { currentVersionId: version.id } : {}),
      },
    });

    if (isScheduled) {
      await tx.seasonalPrice.deleteMany({ where: { packageId: id, isActive: false } });
      await tx.seasonalPrice.createMany({
        data: data.seasonalPrices.map((price) => ({
          packageId: id,
          seasonName: price.seasonName,
          seasonStartMonth: price.seasonStartMonth,
          seasonEndMonth: price.seasonEndMonth,
          pricePerPerson: price.pricePerPerson,
          basis: price.basis,
          gstInclusive: price.gstInclusive,
          isActive: false,
        })),
      });
    } else {
      await tx.seasonalPrice.deleteMany({ where: { packageId: id } });
      await tx.seasonalPrice.createMany({
        data: data.seasonalPrices.map((price) => ({
          packageId: id,
          seasonName: price.seasonName,
          seasonStartMonth: price.seasonStartMonth,
          seasonEndMonth: price.seasonEndMonth,
          pricePerPerson: price.pricePerPerson,
          basis: price.basis,
          gstInclusive: price.gstInclusive,
        })),
      });
    }
  });

  await logActivity(session.user.id, "updated", "package", id, `v${nextVersionNumber}`);
  if (scheduledAt === null) {
    revalidatePath("/");
    revalidatePath("/packages");
    revalidatePath(`/packages/${data.slug}`);
  }

  return NextResponse.json({ success: true, versionNumber: nextVersionNumber });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const { id } = await params;

  await db.$transaction(async (tx) => {
    await tx.package.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        scheduledAt: null,
      },
    });
    await tx.seasonalPrice.deleteMany({ where: { packageId: id, isActive: false } });
  });

  await logActivity(session.user.id, "archived", "package", id);

  return NextResponse.json({ success: true });
}
