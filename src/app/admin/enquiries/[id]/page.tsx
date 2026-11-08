import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { EnquiryDetail } from "@/components/admin/enquiry-detail";

export const instant = false;

async function ensureEnquiryExtraction(id: string, aiExtracted: unknown, aiDraftReply: string | null) {
  const extracted = aiExtracted as { confidence?: number; confidenceVersion?: number } | null;
  if (extracted?.confidenceVersion === 3 && aiDraftReply) return;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  if (!host || !process.env.INTERNAL_API_SECRET) return;

  try {
    await fetch(`${protocol}://${host}/api/internal/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ enquiryId: id }),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[AI] Visit extraction failed for enquiry ${id}:`, error);
  }
}

export default async function AdminEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const enquiry = await db.enquiry.findUnique({
    where: { id },
    include: {
      package: { include: { currentVersion: { select: { title: true, destination: true, days: true } } } },
      assignedTo: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      replies: { orderBy: { sentAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });

  if (!enquiry) notFound();

  await ensureEnquiryExtraction(enquiry.id, enquiry.aiExtracted, enquiry.aiDraftReply);
  const refreshedEnquiry = await db.enquiry.findUnique({
    where: { id },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      assignedTo: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      replies: { orderBy: { sentAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!refreshedEnquiry) notFound();

  const assignableUsers = await db.user.findMany({
    where: { role: { in: ["ADMIN", "CONSULTANT"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const aiSuggestions = Array.isArray(refreshedEnquiry.aiSuggestions)
    ? refreshedEnquiry.aiSuggestions as { packageSlug: string; score: number; reasons: string[]; pricePerPerson: number | null; seasonName: string | null; basis: string | null }[]
    : [];
  const suggestedSlugs = aiSuggestions.map((suggestion) => suggestion.packageSlug);

  let suggestedPackages: {
    id: string;
    slug: string;
    currentVersion: { title: string; destination: string; days: number } | null;
    seasonalPrices: { pricePerPerson: number; seasonName: string; basis: string }[];
  }[] = [];
  if (suggestedSlugs.length) {
    suggestedPackages = await db.package.findMany({
      where: { slug: { in: suggestedSlugs } },
      include: {
        currentVersion: { select: { title: true, destination: true, days: true } },
        seasonalPrices: { where: { isActive: true } },
      },
    });
  }

  return (
    <EnquiryDetail
      enquiry={JSON.parse(JSON.stringify(refreshedEnquiry))}
      admins={assignableUsers}
      suggestedPackages={JSON.parse(JSON.stringify(
        suggestedPackages.map((pkg) => ({
          ...pkg,
          suggestion: aiSuggestions.find((suggestion) => suggestion.packageSlug === pkg.slug),
        }))
      ))}
    />
  );
}
