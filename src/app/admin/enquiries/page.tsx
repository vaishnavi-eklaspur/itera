import { db } from "@/lib/db";
import { EnquiryList } from "@/components/admin/enquiry-list";
import { requireAdminRole } from "@/lib/admin-access";
import { parseEnquiryDateRange } from "@/lib/enquiry-filters";

export const instant = false;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    assignedTo?: string | string[];
    q?: string | string[];
    from?: string | string[];
    through?: string | string[];
  }>;
}) {
  const session = await requireAdminRole("ADMIN", "CONSULTANT");
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const statusValue = first(params.status);
  const assignedToValue = first(params.assignedTo);
  const status = ["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"].includes(statusValue ?? "")
    ? statusValue as "NEW" | "IN_PROGRESS" | "REPLIED" | "CLOSED"
    : undefined;
  const assignedTo = assignedToValue?.slice(0, 100);
  const query = first(params.q)?.trim().slice(0, 100) ?? "";
  const fromValue = first(params.from) ?? "";
  const throughValue = first(params.through) ?? "";
  const dateRange = parseEnquiryDateRange(fromValue, throughValue);

  const where = {
    ...(status ? { status } : {}),
    ...(session.user.role === "CONSULTANT"
      ? { assignedToId: session.user.id }
      : assignedTo === "unassigned"
        ? { assignedToId: null }
        : assignedTo
          ? { assignedToId: assignedTo }
          : {}),
    ...(query ? {
      OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          { message: { contains: query, mode: "insensitive" as const } },
          { package: { is: { currentVersion: { is: { title: { contains: query, mode: "insensitive" as const } } } } } },
      ],
    } : {}),
    ...(!dateRange.error && (dateRange.from || dateRange.through) ? {
      createdAt: {
          ...(dateRange.from ? { gte: dateRange.from } : {}),
          ...(dateRange.through ? { lt: dateRange.through } : {}),
      },
    } : {}),
  };
  const [enquiries, assignableUsers] = await Promise.all([
    db.enquiry.findMany({
      where,
      include: {
          package: { include: { currentVersion: { select: { title: true } } } },
          assignedTo: { select: { id: true, name: true, role: true } },
          replies: { orderBy: { sentAt: "asc" as const }, take: 1, select: { sentAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "CONSULTANT"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
        currentQuery={query}
        currentFrom={fromValue}
        currentThrough={throughValue}
        filterError={dateRange.error}
        assignableUsers={assignableUsers}
        canAssign
      />
    </div>
  );
}
