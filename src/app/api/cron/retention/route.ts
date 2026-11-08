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
  const result = await db.enquiry.updateMany({
    where: { status: "CLOSED", updatedAt: { lt: cutoff }, email: { not: { endsWith: "@privacy.invalid" } } },
    data: {
      name: "Retained traveller",
      email: "retained@privacy.invalid",
      phone: null,
      message: "[Personal data retained only as an anonymized operational record]",
      travelDates: null,
      budget: null,
      aiExtracted: { _retention: "anonymized" },
      aiSuggestions: { _retention: "anonymized" },
      aiDraftReply: null,
      privacyConsentAt: null,
      whatsappConsentAt: null,
      whatsappConsentWithdrawnAt: new Date(),
    },
  });
  return NextResponse.json({ anonymized: result.count, retentionDays });
}
