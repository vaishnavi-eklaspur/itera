import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EnquiryDetail } from "@/components/admin/enquiry-detail";

export const instant = false;

export default async function AdminEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const enquiry = await db.enquiry.findUnique({
    where: { id },
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      assignedTo: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      replies: { orderBy: { sentAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });

  if (!enquiry) notFound();

  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true },
  });

  const aiSuggestions = Array.isArray(enquiry.aiSuggestions)
    ? enquiry.aiSuggestions as { packageSlug: string; score: number; reasons: string[]; pricePerPerson: number | null; seasonName: string | null; basis: string | null }[]
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
      enquiry={JSON.parse(JSON.stringify(enquiry))}
      admins={admins}
      suggestedPackages={JSON.parse(JSON.stringify(
        suggestedPackages.map((pkg) => ({
          ...pkg,
          suggestion: aiSuggestions.find((suggestion) => suggestion.packageSlug === pkg.slug),
        }))
      ))}
    />
  );
}
