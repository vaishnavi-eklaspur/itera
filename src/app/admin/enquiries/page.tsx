import { db } from "@/lib/db";
import { EnquiryList } from "@/components/admin/enquiry-list";

export const instant = false;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const where = status ? { status: status as "NEW" | "IN_PROGRESS" | "REPLIED" | "CLOSED" } : {};
  const enquiries = await db.enquiry.findMany({
    where,
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      assignedTo: { select: { id: true, name: true } },
      replies: { orderBy: { sentAt: "asc" as const }, take: 1, select: { sentAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-stone-900 mb-6">Enquiries</h1>
      <EnquiryList enquiries={JSON.parse(JSON.stringify(enquiries))} currentStatus={status} />
    </div>
  );
}
