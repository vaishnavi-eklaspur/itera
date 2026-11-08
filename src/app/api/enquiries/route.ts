import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquiryFormSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { sendAutoAckEmail } from "@/lib/email";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`enquiry:${ip}`, 60_000, 5)) return rateLimitResponse();

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
  if (!data.privacyConsent) {
    return NextResponse.json({ error: "Please accept the privacy notice before sending your enquiry." }, { status: 400 });
  }

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
      children: data.children ?? null,
      budget: data.budget || null,
      channel: "WEB",
      privacyConsentAt: new Date(),
      privacyConsentSource: "ENQUIRY_FORM",
      privacyConsentVersion: "2026-11-09",
      whatsappConsentAt: data.whatsappConsent ? new Date() : null,
      whatsappConsentSource: data.whatsappConsent ? "ENQUIRY_FORM" : null,
      whatsappConsentVersion: data.whatsappConsent ? "2026-11-09" : null,
      status: "NEW",
    },
  });

  // Send auto-acknowledgement email, then mark timestamp
  let pkg = null;
  if (enquiry.packageId) {
    const p = await db.package.findUnique({
      where: { id: enquiry.packageId },
      include: { currentVersion: { select: { title: true, destination: true, days: true } } },
    });
    if (p?.currentVersion) pkg = p.currentVersion;
  }
  try {
    await sendAutoAckEmail(data, pkg);
    await db.enquiry.update({
      where: { id: enquiry.id },
      data: { autoAckSentAt: new Date() },
    });
  } catch (e) {
    console.error("[EMAIL] Auto-ack failed:", e);
  }

  // Complete extraction before confirming submission so serverless runtimes do not terminate it.
  try {
    const extractionResponse = await fetch(`${req.nextUrl.origin}/api/internal/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET || "" },
      body: JSON.stringify({ enquiryId: enquiry.id }),
    });
    if (!extractionResponse.ok) {
      console.error(`[AI] Extraction failed for enquiry ${enquiry.id}: ${extractionResponse.status}`);
    }
  } catch (error) {
    console.error(`[AI] Extraction request failed for enquiry ${enquiry.id}:`, error);
  }

  return NextResponse.json({
    success: true,
    message: "Thank you for your enquiry! We'll get back to you within an hour.",
    enquiryId: enquiry.id,
  });
}

export async function GET() {
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
