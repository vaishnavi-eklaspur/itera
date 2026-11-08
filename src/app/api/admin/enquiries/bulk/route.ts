import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;

  const { ids, status, assignedToId } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No enquiries selected" }, { status: 400 });
  }

  if (status && !["IN_PROGRESS", "REPLIED", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (assignedToId) {
    const assignee = await db.user.findFirst({
      where: { id: assignedToId, role: { in: ["ADMIN", "CONSULTANT"] } },
      select: { id: true },
    });
    if (!assignee) {
      return NextResponse.json({ error: "Assignee must be an admin or consultant" }, { status: 400 });
    }
  }

  const data: { status?: "IN_PROGRESS" | "REPLIED" | "CLOSED"; assignedToId?: string | null } = {};
  if (status) data.status = status;
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No bulk action provided" }, { status: 400 });
  }

  await db.enquiry.updateMany({
    where: { id: { in: ids } },
    data,
  });

  if (assignedToId !== undefined) {
    await db.enquiry.updateMany({
      where: { id: { in: ids }, status: "NEW", ...(assignedToId ? {} : { assignedToId: null }) },
      data: { status: "IN_PROGRESS" },
    });
  }
  await Promise.all(ids.map((id: string) => {
    if (assignedToId !== undefined) {
      return logActivity(
        session.user.id,
        assignedToId ? "assigned" : "unassigned",
        "enquiry",
        id,
        assignedToId ? "Bulk assignment" : "Bulk assignment removed"
      );
    }
    return logActivity(session.user.id, "status changed", "enquiry", id, `Bulk update → ${status}`);
  }));

  return NextResponse.json({ success: true, updated: ids.length });
}
