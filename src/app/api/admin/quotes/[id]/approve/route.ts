import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { authorizeRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id } = await params;
  const quote = await db.quote.findUnique({
    where: { id },
    select: {
      id: true,
      generatedByAI: true,
      approvedAt: true,
      enquiry: { select: { assignedToId: true } },
    },
  });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!quote.generatedByAI) {
    return NextResponse.json({ error: "Only AI-generated quotes require approval" }, { status: 400 });
  }
  if (session.user.role === "CONSULTANT" && quote.enquiry?.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Enquiry is not assigned to you" }, { status: 403 });
  }
  if (quote.approvedAt) return NextResponse.json({ approvedAt: quote.approvedAt });

  const approvedAt = new Date();
  await db.quote.update({ where: { id }, data: { approvedAt } });
  await logActivity(session.user.id, "approved", "quote", id, "AI-generated quote approved for sharing");

  return NextResponse.json({ approvedAt });
}
