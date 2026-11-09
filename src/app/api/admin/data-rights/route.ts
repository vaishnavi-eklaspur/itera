import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeRole } from "@/lib/roles";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const correctionDataSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(500).nullable().optional(),
  travelDates: z.string().max(500).nullable().optional(),
  budget: z.string().max(500).nullable().optional(),
  adults: z.number().int().min(0).nullable().optional(),
  children: z.number().int().min(0).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
type CorrectionData = z.infer<typeof correctionDataSchema>;

function parseCorrectionData(value: unknown): CorrectionData | null {
  const parsed = correctionDataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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
  const resolvedAt = status === "COMPLETED" || status === "REJECTED" ? new Date() : null;
  const resolutionData = {
    status,
    resolvedAt,
    resolvedById: resolvedAt ? session.user.id : null,
    resolutionNote: request.type === "DELETION" && status === "COMPLETED"
      ? "[Deletion completed; linked personal data anonymized]"
      : typeof body?.resolutionNote === "string" ? body.resolutionNote.slice(0, 2000) : null,
  };
  if (request.type === "CORRECTION" && status === "COMPLETED") {
    const updated = await db.$transaction(async (tx) => {
      const enquiry = request.enquiryId
        ? await tx.enquiry.findUnique({ where: { id: request.enquiryId }, select: { id: true } })
        : await tx.enquiry.findFirst({ where: { email: request.email }, select: { id: true } });
      if (!enquiry) return null;
      const enquiryData = Object.fromEntries(Object.entries(correctionData ?? {}));
      await tx.enquiry.update({ where: { id: enquiry.id }, data: enquiryData });
      if (request.userId) {
        const userData = Object.fromEntries(
          Object.entries(correctionData ?? {}).filter(([key]) => ["name", "email", "phone"].includes(key)),
        );
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: request.userId }, data: userData });
        }
      }
      return tx.dataRightsRequest.update({ where: { id }, data: resolutionData });
    });
    if (!updated) return NextResponse.json({ error: "Enquiry not found for correction" }, { status: 404 });
    return NextResponse.json(updated);
  }
  if (status === "COMPLETED" && request.type === "DELETION") {
    const deletedEmail = `deleted-${request.id}@privacy.invalid`;
    const updated = await db.$transaction(async (tx) => {
      const enquiries = await tx.enquiry.findMany({
        where: { OR: [...(request.userId ? [{ userId: request.userId }] : []), { email: request.email }] },
        select: { id: true, userId: true },
      });
      const enquiryIds = enquiries.map((enquiry) => enquiry.id);
      let quoteIds: string[] = [];

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
        const quotes = await tx.quote.findMany({
          where: { enquiryId: { in: enquiryIds } },
          select: { id: true },
        });
        quoteIds = quotes.map((quote) => quote.id);
      }

      const activityEntityIds = [...enquiryIds, ...quoteIds, ...(request.userId ? [request.userId] : [])];
      const activityFilters = [
        ...(request.userId ? [{ userId: request.userId }] : []),
        ...(activityEntityIds.length > 0 ? [{ entityId: { in: activityEntityIds } }] : []),
      ];
      if (activityFilters.length > 0) {
        await tx.activityLog.updateMany({
          where: { OR: activityFilters },
          data: { details: "[Activity details deleted at traveller request]" },
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
      }

      return tx.dataRightsRequest.update({
        where: { id: request.id },
        data: {
          email: deletedEmail,
          details: "[Data-rights request details deleted at traveller request]",
          ...resolutionData,
        },
      });
    });
    return NextResponse.json(updated);
  }
  const updated = await db.dataRightsRequest.update({
    where: { id },
    data: resolutionData,
  });
  return NextResponse.json(updated);
}
