import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const withdrawalSchema = z.object({
  channel: z.enum(["PRIVACY", "WHATSAPP"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!rateLimit(`consent:${getClientIp(req)}`, 900_000, 20)) return rateLimitResponse(900);
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = withdrawalSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid consent withdrawal request" }, { status: 400 });
  }

  const { id } = await params;
  const enquiry = await db.enquiry.findFirst({
    where: { id, email: session.user.email },
    select: { id: true },
  });
  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  const withdrawnAt = new Date();
  const data = parsed.data.channel === "WHATSAPP"
    ? { whatsappConsentWithdrawnAt: withdrawnAt }
    : { privacyConsentWithdrawnAt: withdrawnAt };

  await db.enquiry.update({ where: { id }, data });
  return NextResponse.json({ success: true, withdrawnAt });
}
