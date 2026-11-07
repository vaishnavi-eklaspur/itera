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
