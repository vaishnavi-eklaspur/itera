import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = Number(process.env.ENQUIRY_RETENTION_DAYS ?? 730);
  if (!Number.isInteger(retentionDays) || retentionDays < 30) {
    return NextResponse.json({ error: "Invalid retention configuration" }, { status: 500 });
  }
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const anonymized = await db.$transaction(async (tx) => {
    const enquiries = await tx.enquiry.findMany({
      where: { status: "CLOSED", updatedAt: { lt: cutoff }, email: { not: { endsWith: "@privacy.invalid" } } },
      select: { id: true },
    });
    const enquiryIds = enquiries.map((enquiry) => enquiry.id);
    if (enquiryIds.length === 0) return 0;

    await tx.enquiry.updateMany({
      where: { id: { in: enquiryIds } },
      data: {
        userId: null,
        name: "Retained traveller",
        email: "retained@privacy.invalid",
        phone: null,
        message: "[Personal data retained only as an anonymized operational record]",
        travelDates: null,
        adults: null,
        children: null,
        budget: null,
        aiExtracted: { _retention: "anonymized" },
        aiSuggestions: { _retention: "anonymized" },
        aiDraftReply: null,
        privacyConsentAt: null,
        privacyConsentSource: null,
        privacyConsentVersion: null,
        whatsappConsentAt: null,
        whatsappConsentSource: null,
        whatsappConsentVersion: null,
        whatsappConsentWithdrawnAt: new Date(),
      },
    });
    await tx.enquiryNote.updateMany({
      where: { enquiryId: { in: enquiryIds } },
      data: { content: "[Note content anonymized after enquiry retention period]" },
    });
    await tx.enquiryReply.updateMany({
      where: { enquiryId: { in: enquiryIds } },
      data: { content: "[Reply content anonymized after enquiry retention period]" },
    });
    await tx.quote.updateMany({
      where: { enquiryId: { in: enquiryIds } },
      data: {
        travellers: 0,
        travelDate: null,
        notes: "[Quote personal data anonymized after enquiry retention period]",
      },
    });

    return enquiries.length;
  });
  return NextResponse.json({ anonymized, retentionDays });
}
