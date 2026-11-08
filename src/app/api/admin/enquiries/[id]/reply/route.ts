import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { authorizeRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

const replySchema = z.object({
  content: z.string().min(1, "Reply cannot be empty"),
  channel: z.enum(["EMAIL", "WHATSAPP", "SYSTEM"]).default("EMAIL"),
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
  const parsed = replySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const enquiry = await db.enquiry.findUnique({
    where: { id },
    select: { assignedToId: true, whatsappConsentAt: true },
  });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  if (session.user.role === "CONSULTANT" && enquiry.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Enquiry is not assigned to you" }, { status: 403 });
  }
  if (parsed.data.channel === "WHATSAPP" && !enquiry.whatsappConsentAt) {
    return NextResponse.json({ error: "WhatsApp consent is required before sending this reply" }, { status: 400 });
  }

  const [reply] = await db.$transaction([
    db.enquiryReply.create({
      data: {
        enquiryId: id,
        authorId: session.user.id,
        content: parsed.data.content,
        channel: parsed.data.channel,
      },
    }),
    db.enquiry.update({
      where: { id },
      data: { status: "REPLIED" },
    }),
  ]);

  await logActivity(session.user.id, "replied", "enquiry", id, parsed.data.channel);

  return NextResponse.json(reply, { status: 201 });
}
