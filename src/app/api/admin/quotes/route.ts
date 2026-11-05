import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/activity";

const quoteSchema = z.object({
  packageId: z.string(),
  enquiryId: z.string().optional(),
  travellers: z.number().min(1),
  travelDate: z.string().optional(),
  pricePerPerson: z.number().min(0),
  totalPrice: z.number().min(0),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  notes: z.string().optional(),
  validDays: z.number().min(1).default(7),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotes = await db.quote.findMany({
    include: {
      package: { include: { currentVersion: { select: { title: true, destination: true } } } },
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const token = randomUUID();
  const validUntil = new Date(Date.now() + (parsed.data.validDays ?? 7) * 24 * 60 * 60 * 1000);

  const quote = await db.quote.create({
    data: {
      token,
      packageId: parsed.data.packageId,
      enquiryId: parsed.data.enquiryId,
      travellers: parsed.data.travellers,
      travelDate: parsed.data.travelDate,
      pricePerPerson: parsed.data.pricePerPerson,
      totalPrice: parsed.data.totalPrice,
      inclusions: parsed.data.inclusions,
      exclusions: parsed.data.exclusions,
      notes: parsed.data.notes,
      validUntil,
      authorId: session.user.id,
    },
  });

  await logActivity(session.user.id, "created", "quote", quote.id, `Quote for ${parsed.data.travellers} pax`);

  return NextResponse.json({ id: quote.id, token }, { status: 201 });
}
