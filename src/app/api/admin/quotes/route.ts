import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/activity";
import { authorizeRole } from "@/lib/roles";
import { calculateGst } from "@/lib/gst";

function replaceGeneratedQuoteBlock(draft: string | null | undefined, quoteBlock: string) {
  const lines = (draft ?? "").split(/\r?\n/);
  const kept: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (
      lines[index].startsWith("Your verified quote is ready:") &&
      lines[index + 1]?.startsWith("Download the branded PDF:") &&
      lines[index + 2]?.startsWith("Please review the details and let us know if you would like to proceed.")
    ) {
      index += 2;
      continue;
    }
    kept.push(lines[index]);
  }

  return [kept.join("\n").trim(), quoteBlock].filter(Boolean).join("\n\n");
}

const quoteSchema = z.object({
  packageId: z.string(),
  enquiryId: z.string().optional(),
  travellers: z.number().min(1),
  travelDate: z.string().optional(),
  pricePerPerson: z.number().min(0),
  basis: z.string().min(1).default("Per person, twin sharing"),
  gstInclusive: z.boolean().default(true),
  gstRate: z.number().min(0).max(100),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  notes: z.string().optional(),
  validDays: z.number().min(1).default(7),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotes = await db.quote.findMany({
    select: {
      id: true,
      token: true,
      travellers: true,
      travelDate: true,
      pricePerPerson: true,
      basis: true,
      gstInclusive: true,
      gstRate: true,
      totalPrice: true,
      validUntil: true,
      createdAt: true,
      package: { select: { currentVersion: { select: { title: true, destination: true } } } },
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "CONSULTANT");
  if (denied) return denied;

  const body = await req.json();
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const token = randomUUID();
  const validUntil = new Date(Date.now() + (parsed.data.validDays ?? 7) * 24 * 60 * 60 * 1000);
  const gst = calculateGst(
    parsed.data.pricePerPerson,
    parsed.data.travellers,
    parsed.data.gstRate,
    parsed.data.gstInclusive,
  );

  const quote = await db.quote.create({
    data: {
      token,
      packageId: parsed.data.packageId,
      enquiryId: parsed.data.enquiryId,
      travellers: parsed.data.travellers,
      travelDate: parsed.data.travelDate,
      pricePerPerson: parsed.data.pricePerPerson,
      basis: parsed.data.basis,
      gstInclusive: parsed.data.gstInclusive,
      gstRate: parsed.data.gstRate,
      totalPrice: gst.total,
      inclusions: parsed.data.inclusions,
      exclusions: parsed.data.exclusions,
      notes: parsed.data.notes,
      validUntil,
      authorId: session.user.id,
    },
  });

  if (parsed.data.enquiryId) {
    const enquiry = await db.enquiry.findUnique({
      where: { id: parsed.data.enquiryId },
      select: { aiDraftReply: true },
    });
    const quoteLink = `${req.nextUrl.origin}/quote/${quote.token}`;
    const pdfLink = `${req.nextUrl.origin}/api/quotes/${quote.token}/pdf`;
    const quoteLine = `Your verified quote is ready: ${quoteLink}\nDownload the branded PDF: ${pdfLink}\nPlease review the details and let us know if you would like to proceed.`;
    const updatedDraft = replaceGeneratedQuoteBlock(enquiry?.aiDraftReply, quoteLine);
    if (enquiry && enquiry.aiDraftReply !== updatedDraft) {
      await db.enquiry.update({
        where: { id: parsed.data.enquiryId },
        data: {
          aiDraftReply: updatedDraft,
        },
      });
    }
  }

  await logActivity(session.user.id, "created", "quote", quote.id, `Quote for ${parsed.data.travellers} pax`);

  return NextResponse.json({ id: quote.id, token }, { status: 201 });
}
