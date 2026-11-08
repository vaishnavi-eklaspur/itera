import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeRole } from "@/lib/roles";
import { randomUUID } from "node:crypto";

const correctionFields = ["name", "email", "phone", "travelDates", "budget", "adults", "children"] as const;
type CorrectionData = Partial<Record<(typeof correctionFields)[number], string | number | null>>;

function parseCorrectionData(value: unknown): CorrectionData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.some(([key]) => !correctionFields.includes(key as typeof correctionFields[number]))) return null;
  const result: CorrectionData = {};
  for (const [key, raw] of entries) {
    if (raw !== null && typeof raw !== "string" && typeof raw !== "number") return null;
    if (typeof raw === "string" && raw.length > 500) return null;
    if ((key === "adults" || key === "children") && (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0)) return null;
    result[key as keyof CorrectionData] = raw as never;
  }
  return result;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;
  return NextResponse.json(await db.dataRightsRequest.findMany({
    orderBy: { requestedAt: "asc" },
    include: { enquiry: { select: { id: true, name: true, email: true, message: true } } },
  }));
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const status = ["IN_REVIEW", "COMPLETED", "REJECTED"].includes(body?.status) ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: "Invalid request update" }, { status: 400 });

  const request = await db.dataRightsRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status === "COMPLETED" || request.status === "REJECTED") {
    return NextResponse.json({ error: "This request has already been resolved" }, { status: 409 });
  }
  const correctionData = request.type === "CORRECTION" && status === "COMPLETED"
    ? parseCorrectionData(body?.correctionData)
    : null;
  if (request.type === "CORRECTION" && status === "COMPLETED" && !correctionData) {
    return NextResponse.json(
      { error: "Validated correctionData is required to complete a correction request" },
      { status: 400 },
    );
  }
  if (request.type === "CORRECTION" && status === "COMPLETED") {
    const enquiry = request.enquiryId
      ? await db.enquiry.findUnique({ where: { id: request.enquiryId }, select: { id: true } })
      : await db.enquiry.findFirst({ where: { email: request.email }, select: { id: true } });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found for correction" }, { status: 404 });
    const enquiryData = Object.fromEntries(Object.entries(correctionData ?? {}));
    await db.enquiry.update({ where: { id: enquiry.id }, data: enquiryData });
    if (request.userId) {
      const userData = Object.fromEntries(
        Object.entries(correctionData ?? {}).filter(([key]) => ["name", "email", "phone"].includes(key)),
      );
      if (Object.keys(userData).length > 0) {
        await db.user.update({ where: { id: request.userId }, data: userData });
      }
    }
  }
  if (status === "COMPLETED" && request.type === "DELETION") {
    const deletedEmail = `deleted-${request.id}@privacy.invalid`;
    await db.$transaction(async (tx) => {
      const enquiries = await tx.enquiry.findMany({
        where: { OR: [...(request.userId ? [{ userId: request.userId }] : []), { email: request.email }] },
        select: { id: true, userId: true },
      });
      const enquiryIds = enquiries.map((enquiry) => enquiry.id);

      if (enquiryIds.length > 0) {
        await tx.enquiry.updateMany({
          where: { id: { in: enquiryIds } },
          data: {
            name: "Deleted traveller",
            email: deletedEmail,
            phone: null,
            message: "[Personal data deleted at traveller request]",
            travelDates: null,
            adults: null,
            children: null,
            budget: null,
            aiExtracted: Prisma.JsonNull,
            aiSuggestions: Prisma.JsonNull,
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
        await tx.enquiryReply.updateMany({
          where: { enquiryId: { in: enquiryIds } },
          data: { content: "[Reply content deleted at traveller request]" },
        });
        await tx.enquiryNote.updateMany({
          where: { enquiryId: { in: enquiryIds } },
          data: { content: "[Note content deleted at traveller request]" },
        });
        await tx.quote.updateMany({
          where: { enquiryId: { in: enquiryIds } },
          data: {
            travellers: 0,
            travelDate: null,
            notes: "[Quote personal data deleted at traveller request]",
          },
        });
      }

      if (request.userId) {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            name: "Deleted traveller",
            email: deletedEmail,
            phone: null,
            passwordHash: `deleted:${randomUUID()}`,
          },
        });
        await tx.activityLog.updateMany({
          where: { userId: request.userId },
          data: { details: "[Activity details deleted at traveller request]" },
        });
      }

      await tx.dataRightsRequest.update({
        where: { id: request.id },
        data: {
          email: deletedEmail,
          details: "[Data-rights request details deleted at traveller request]",
        },
      });
    });
  }
  const updated = await db.dataRightsRequest.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "COMPLETED" || status === "REJECTED" ? new Date() : null,
      resolvedById: status === "COMPLETED" || status === "REJECTED" ? session.user.id : null,
      resolutionNote: request.type === "DELETION"
        ? "[Deletion completed; linked personal data anonymized]"
        : typeof body?.resolutionNote === "string" ? body.resolutionNote.slice(0, 2000) : null,
    },
  });
  return NextResponse.json(updated);
}
