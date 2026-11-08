import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { staffEnquirySchema } from "@/lib/validations";
import { authorizeRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const q = searchParams.get("q");

  const enquiries = await db.enquiry.findMany({
    where: {
      ...(status && status !== "all" && { status: status as "NEW" | "IN_PROGRESS" | "REPLIED" | "CLOSED" }),
      ...(assignedTo && { assignedToId: assignedTo }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      assignedTo: { select: { id: true, name: true } },
      replies: { select: { sentAt: true }, take: 1, orderBy: { sentAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(enquiries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const parsed = staffEnquirySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const enquiry = await db.enquiry.create({
    data: {
      packageId: data.packageId || null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      message: data.message,
      travelDates: data.travelDates || null,
      adults: data.adults || null,
      children: data.children ?? null,
      budget: data.budget || null,
      channel: data.channel,
      privacyConsentAt: data.privacyConsent ? new Date() : null,
      whatsappConsentAt: data.whatsappConsent ? new Date() : null,
      status: "NEW",
    },
  });

  await logActivity(session.user.id, "created", "enquiry", enquiry.id, `Received via ${data.channel.toLowerCase()}`);

  if (process.env.INTERNAL_API_SECRET) {
    try {
      const aiResponse = await fetch(`${req.nextUrl.origin}/api/internal/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({ enquiryId: enquiry.id }),
      });
      if (!aiResponse.ok) {
        console.error(`[AI] Staff intake extraction failed for enquiry ${enquiry.id}: ${aiResponse.status}`);
      }
    } catch (error) {
      console.error(`[AI] Staff intake extraction request failed for enquiry ${enquiry.id}:`, error);
    }
  }

  return NextResponse.json({ id: enquiry.id }, { status: 201 });
}
