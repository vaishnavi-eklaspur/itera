import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquiryFormSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = enquiryFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const session = await auth();
  const data = parsed.data;

  const enquiry = await db.enquiry.create({
    data: {
      packageId: data.packageId || null,
      userId: session?.user?.id || null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      message: data.message,
      travelDates: data.travelDates || null,
      adults: data.adults || null,
      children: data.children || null,
      budget: data.budget || null,
      status: "NEW",
      autoAckSentAt: new Date(),
    },
  });

  // Trigger AI extraction asynchronously (fire-and-forget)
  fetch(`${process.env.NEXTAUTH_URL}/api/internal/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enquiryId: enquiry.id }),
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: "Thank you for your enquiry! We'll get back to you within an hour.",
    enquiryId: enquiry.id,
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enquiries = await db.enquiry.findMany({
    where: { userId: session.user.id },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(enquiries);
}
