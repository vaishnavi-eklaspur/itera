import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const pkg = await db.package.findUnique({ where: { id } });
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!pkg.currentVersionId) return NextResponse.json({ error: "No version to publish" }, { status: 400 });

  await db.package.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });

  await logActivity(session.user.id, "published", "package", id);

  return NextResponse.json({ success: true });
}
