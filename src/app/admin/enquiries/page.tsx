import { db } from "@/lib/db";
import Link from "next/link";
import { timeAgo, responseTimeBadge } from "@/lib/utils";

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
      assignedTo: { select: { name: true } },
      replies: { orderBy: { sentAt: "asc" as const }, take: 1, select: { sentAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statuses = ["ALL", "NEW", "IN_PROGRESS", "REPLIED", "CLOSED"];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Enquiries</h1>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/enquiries" : `/admin/enquiries?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              (s === "ALL" && !status) || s === status
                ? "bg-teal-100 text-teal-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {enquiries.map((e) => {
            const firstReplyAt = e.replies[0]?.sentAt ?? null;
            const badge = responseTimeBadge(e.createdAt, firstReplyAt);
            return (
              <Link
                key={e.id}
                href={`/admin/enquiries/${e.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      e.status === "NEW" ? "bg-amber-100 text-amber-700" :
                      e.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      e.status === "REPLIED" ? "bg-green-100 text-green-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {e.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{e.email}</p>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">{e.message}</p>
                  {e.package?.currentVersion && (
                    <p className="text-xs text-teal-600 mt-1">Package: {e.package.currentVersion.title}</p>
                  )}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(e.createdAt)}</p>
                  {e.assignedTo && (
                    <p className="text-xs text-slate-400">{e.assignedTo.name}</p>
                  )}
                </div>
              </Link>
            );
          })}
          {enquiries.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No enquiries found</p>
          )}
        </div>
      </div>
    </div>
  );
}
