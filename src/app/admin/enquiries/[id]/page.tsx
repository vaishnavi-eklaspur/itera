import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EnquiryDetail } from "@/components/admin/enquiry-detail";
import { requireAdminRole } from "@/lib/admin-access";

export const instant = false;

export default async function AdminEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminRole("ADMIN", "CONSULTANT");
  const { id } = await params;

  const enquiry = await db.enquiry.findUnique({
    where: {
      id,
      ...(session.user.role === "CONSULTANT" ? { assignedToId: session.user.id } : {}),
    },
    include: {
      package: { include: { currentVersion: { select: { title: true, destination: true, days: true } } } },
      assignedTo: { select: { id: true, name: true, role: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      replies: { orderBy: { sentAt: "desc" }, include: { author: { select: { name: true } } } },
      quotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });

  if (!enquiry) notFound();

  const activityLogs = await db.activityLog.findMany({
    where: { entity: "enquiry", entityId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  const assignableUsers = await db.user.findMany({
    where: { role: { in: ["ADMIN", "CONSULTANT"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
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
      activityLogs={JSON.parse(JSON.stringify(activityLogs))}
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
