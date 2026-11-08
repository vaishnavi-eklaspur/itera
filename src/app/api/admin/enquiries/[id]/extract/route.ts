import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeRole } from "@/lib/roles";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const { id } = await params;
  if (session.user.role === "CONSULTANT") {
    const enquiry = await db.enquiry.findUnique({
      where: { id },
      select: { assignedToId: true },
    });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (enquiry.assignedToId !== session.user.id) {
      return NextResponse.json({ error: "Enquiry is not assigned to you" }, { status: 403 });
    }
  }
  const res = await fetch(`${req.nextUrl.origin}/api/internal/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
    },
    body: JSON.stringify({ enquiryId: id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
