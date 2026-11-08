import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { ids, status, assignedToId } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No enquiries selected" }, { status: 400 });
  }
  if (session.user.role === "CONSULTANT") {
    const assignedEnquiries = await db.enquiry.count({
      where: { id: { in: ids }, assignedToId: session.user.id },
    });
    if (assignedEnquiries !== ids.length) {
      return NextResponse.json({ error: "You can only update enquiries assigned to you" }, { status: 403 });
    }
  }

  if (status && !["IN_PROGRESS", "REPLIED", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let assigneeLabel = "";
  if (assignedToId) {
    const assignee = await db.user.findFirst({
      where: { id: assignedToId, role: { in: ["ADMIN", "CONSULTANT"] } },
      select: { id: true, name: true, role: true },
    });
    if (!assignee) {
      return NextResponse.json({ error: "Assignee must be an admin or consultant" }, { status: 400 });
    }
    assigneeLabel = `${assignee.name} (${assignee.role})`;
  }

  const data: { status?: "IN_PROGRESS" | "REPLIED" | "CLOSED"; assignedToId?: string | null } = {};
  if (status) data.status = status;
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No bulk action provided" }, { status: 400 });
  }

  const existingEnquiries = await db.enquiry.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });

  await db.enquiry.updateMany({
    where: { id: { in: ids } },
    data,
  });

  if (assignedToId !== undefined) {
    if (assignedToId) {
      await db.enquiry.updateMany({
        where: { id: { in: ids }, status: "NEW" },
        data: { status: "IN_PROGRESS" },
      });
    }
    if (assignedToId) {
      await db.enquiryNote.createMany({
        data: ids.map((id: string) => ({
          enquiryId: id,
          authorId: session.user.id,
          content: `Assignment notice: this enquiry is now assigned to ${assigneeLabel}.`,
        })),
      });
    }
  }
  await Promise.all(ids.map((id: string) => {
    const existing = existingEnquiries.find((enquiry) => enquiry.id === id);
    const activityLogs = [];
    if (assignedToId !== undefined) {
      activityLogs.push(logActivity(
        session.user.id,
        assignedToId ? "assigned" : "unassigned",
        "enquiry",
        id,
        assignedToId ? "Bulk assignment" : "Bulk assignment removed"
      ));
    }
    if (status && existing && existing.status !== status) {
      activityLogs.push(logActivity(session.user.id, "status changed", "enquiry", id, `${existing.status} → ${status}`));
    } else if (assignedToId && existing?.status === "NEW") {
      activityLogs.push(logActivity(session.user.id, "status changed", "enquiry", id, "NEW → IN_PROGRESS"));
    }
    return Promise.all(activityLogs);
  }));
  revalidatePath("/admin/enquiries");

  return NextResponse.json({ success: true, updated: ids.length });
}
