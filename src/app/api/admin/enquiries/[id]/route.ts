import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { authorizeRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const enquiry = await db.enquiry.findUnique({
    where: { id },
    include: {
      package: {
        include: {
          currentVersion: true,
          seasonalPrices: { where: { isActive: true } },
        },
      },
      assignedTo: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, name: true, email: true } },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      replies: {
        include: { author: { select: { name: true } } },
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  // Also fetch suggested packages if AI suggestions exist
  let suggestedPackages = null;
  if (enquiry.aiSuggestions && Array.isArray(enquiry.aiSuggestions)) {
    const slugs = (enquiry.aiSuggestions as { packageSlug: string }[]).map((s) => s.packageSlug);
    suggestedPackages = await db.package.findMany({
      where: { slug: { in: slugs } },
      include: {
        currentVersion: { select: { title: true, days: true, destination: true } },
        seasonalPrices: { where: { isActive: true } },
      },
    });
  }

  return NextResponse.json({ ...enquiry, suggestedPackages });
}

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"]).optional(),
  assignedToId: z.string().nullable().optional(),
  aiExtracted: z.any().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  const existing = await db.enquiry.findUnique({
    where: { id },
    select: { status: true, assignedToId: true },
  });
  if (!existing) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

  if (data.status !== undefined) updateData.status = data.status;
  if (data.assignedToId !== undefined) {
    if (data.assignedToId) {
      const assignee = await db.user.findFirst({
        where: { id: data.assignedToId, role: { in: ["ADMIN", "CONSULTANT"] } },
        select: { id: true },
      });
      if (!assignee) {
        return NextResponse.json({ error: "Assignee must be an admin or consultant" }, { status: 400 });
      }
    }
    updateData.assignedToId = data.assignedToId;
    if (data.assignedToId && data.status === undefined && existing.status === "NEW") {
      updateData.status = "IN_PROGRESS";
    }
  }
  if (data.aiExtracted !== undefined) updateData.aiExtracted = data.aiExtracted;

  const updated = await db.enquiry.update({
    where: { id },
    data: updateData,
  });

  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    const assignee = data.assignedToId
      ? await db.user.findUnique({ where: { id: data.assignedToId }, select: { name: true, role: true } })
      : null;
    await logActivity(
      session.user.id,
      data.assignedToId ? "assigned" : "unassigned",
      "enquiry",
      id,
      data.assignedToId ? `${assignee?.role ?? "Staff"} — ${assignee?.name ?? "Unknown"}` : "Assignment removed"
    );
  }
  if (updated.status !== existing.status) {
    await logActivity(session.user.id, "status changed", "enquiry", id, `${existing.status} → ${updated.status}`);
  }

  return NextResponse.json(updated);
}
