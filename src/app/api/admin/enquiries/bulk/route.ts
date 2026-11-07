import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const { ids, status, assignedToId } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No enquiries selected" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (status) data.status = status;
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;

  await db.enquiry.updateMany({
    where: { id: { in: ids } },
    data,
  });

  return NextResponse.json({ success: true, updated: ids.length });
}
