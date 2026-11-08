import { db } from "@/lib/db";
import { EnquiryList } from "@/components/admin/enquiry-list";
import { requireAdminRole } from "@/lib/admin-access";

export const instant = false;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assignedTo?: string }>;
}) {
  const session = await requireAdminRole("ADMIN", "CONSULTANT");
  const { status, assignedTo } = await searchParams;

  const where = {
    ...(status ? { status: status as "NEW" | "IN_PROGRESS" | "REPLIED" | "CLOSED" } : {}),
    ...(session.user.role === "CONSULTANT"
      ? { assignedToId: session.user.id }
      : assignedTo === "unassigned"
        ? { assignedToId: null }
        : assignedTo
          ? { assignedToId: assignedTo }
          : {}),
  };
  const enquiries = await db.enquiry.findMany({
    where,
    include: {
      package: { include: { currentVersion: { select: { title: true } } } },
      assignedTo: { select: { id: true, name: true, role: true } },
      replies: { orderBy: { sentAt: "asc" as const }, take: 1, select: { sentAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const assignableUsers = await db.user.findMany({
    where: { role: { in: ["ADMIN", "CONSULTANT"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-stone-900">Enquiries</h1>
          {session.user.role === "CONSULTANT" && (
            <p className="text-sm text-stone-500 mt-1">Enquiries assigned to you, including those awaiting your follow-up.</p>
          )}
        </div>
      </div>
      <EnquiryList
        enquiries={JSON.parse(JSON.stringify(enquiries))}
        currentStatus={status}
        currentAssignedTo={assignedTo}
        assignableUsers={assignableUsers}
        canAssign
      />
    </div>
  );
}
