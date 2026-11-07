import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const denied = authorizeRole(session.user.role, "ADMIN", "EDITOR");
  if (denied) return denied;

  const { versionId } = await req.json();

  const sourceVersion = await db.packageVersion.findUnique({ where: { id: versionId } });
  if (!sourceVersion || sourceVersion.packageId !== id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
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
        itinerary: sourceVersion.itinerary as object,
        photos: sourceVersion.photos,
        mapCenter: sourceVersion.mapCenter as object,
        authorId: session.user.id,
      },
    });

    await tx.package.update({
      where: { id },
      data: { currentVersionId: v.id },
    });

    return v;
  });

  return NextResponse.json({ success: true, versionNumber: restored.versionNumber });
}
