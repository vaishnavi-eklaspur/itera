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

  const aiSuggestions = enquiry.aiSuggestions as { packageIds?: string[] } | null;
  const suggestedIds = aiSuggestions?.packageIds ?? [];

  let suggestedPackages: any[] = [];
  if (suggestedIds.length) {
    suggestedPackages = await db.package.findMany({
      where: { id: { in: suggestedIds } },
      include: { currentVersion: { select: { title: true, destination: true, days: true } } },
    });
  }

  return (
    <EnquiryDetail
      enquiry={JSON.parse(JSON.stringify(enquiry))}
      admins={admins}
      suggestedPackages={JSON.parse(JSON.stringify(suggestedPackages))}
    />
  );
}
