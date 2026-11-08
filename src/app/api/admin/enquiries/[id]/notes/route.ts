import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { authorizeRole } from "@/lib/roles";

const noteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;
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

  const body = await req.json();
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const note = await db.enquiryNote.create({
    data: {
      enquiryId: id,
      authorId: session.user.id,
      content: parsed.data.content,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
