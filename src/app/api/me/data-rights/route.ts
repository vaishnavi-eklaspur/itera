import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`data-rights:${getClientIp(req)}`, 900_000, 10)) return rateLimitResponse(900);
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const type = body?.type === "DELETION" || body?.type === "CORRECTION" ? body.type : null;
  const details = typeof body?.details === "string" ? body.details.trim().slice(0, 2000) : null;
  const enquiryId = typeof body?.enquiryId === "string" ? body.enquiryId : null;
  if (!type) return NextResponse.json({ error: "Choose correction or deletion" }, { status: 400 });
  if (type === "CORRECTION" && !details) {
    return NextResponse.json({ error: "Describe the correction needed" }, { status: 400 });
  }

  if (enquiryId) {
    const owned = await db.enquiry.findFirst({ where: { id: enquiryId, email }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  const request = await db.dataRightsRequest.create({
    data: { userId: session.user.id, enquiryId, email, type, details },
  });
  return NextResponse.json({ id: request.id, status: request.status }, { status: 201 });
}
