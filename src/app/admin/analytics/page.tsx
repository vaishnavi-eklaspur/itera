import { db } from "@/lib/db";
import { connection } from "next/server";
import { Inbox, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { requireAdminRole } from "@/lib/admin-access";
import { AnalyticsVolume } from "@/components/admin/analytics-volume";

export const instant = false;

export default async function AnalyticsPage() {
  await requireAdminRole("ADMIN", "CONSULTANT");
  await connection();
  const [total, byStatus, avgResponseMs, enquiriesLast30, topPackages] = await Promise.all([
    db.enquiry.count(),
    db.enquiry.groupBy({ by: ["status"], _count: true }),
    getAvgResponseTime(),
    getEnquiriesLast30Days(),
    getTopPackages(),
  ]);

  const newCount = byStatus.find((s) => s.status === "NEW")?._count ?? 0;
  const repliedCount = byStatus.find((s) => s.status === "REPLIED")?._count ?? 0;
  const closedCount = byStatus.find((s) => s.status === "CLOSED")?._count ?? 0;
  const slaRate = total > 0 ? Math.round(((repliedCount + closedCount) / total) * 100) : 0;

  const avgHours = avgResponseMs ? Math.round(avgResponseMs / (1000 * 60 * 60) * 10) / 10 : null;

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-stone-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={Inbox} label="Total Enquiries" value={total} />
        <KPI icon={Clock} label="New / Pending" value={newCount} accent />
        <KPI icon={CheckCircle} label="Response Rate" value={`${slaRate}%`} />
        <KPI icon={TrendingUp} label="Avg Response" value={avgHours ? `${avgHours}h` : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Status Breakdown</h2>
          <div className="space-y-3">
            {byStatus.map((s) => {
              const pct = total > 0 ? Math.round((s._count / total) * 100) : 0;
              const color =
                s.status === "NEW" ? "bg-amber-500" :
                s.status === "IN_PROGRESS" ? "bg-blue-500" :
                s.status === "REPLIED" ? "bg-green-500" :
                "bg-stone-400";
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-600">{s.status.replace("_", " ")}</span>
                    <span className="text-stone-400">{s._count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Top Packages by Enquiries</h2>
          {topPackages.length === 0 ? (
            <p className="text-sm text-stone-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topPackages.map((tp, i) => (
                <div key={tp.packageId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-forest-100 text-forest-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{tp.title}</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-900">{tp.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-stone-200 p-6 lg:col-span-2">
          <h2 className="font-semibold text-stone-900 mb-4">Enquiry Volume (Last 30 Days)</h2>
          <AnalyticsVolume initialData={enquiriesLast30} />
        </section>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <Icon className={`w-5 h-5 ${accent ? "text-amber-500" : "text-forest-600"} mb-2`} />
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  );
}

async function getAvgResponseTime() {
  const enquiriesWithReplies = await db.enquiry.findMany({
    where: { replies: { some: {} } },
    select: {
      createdAt: true,
      replies: { orderBy: { sentAt: "asc" }, take: 1, select: { sentAt: true } },
    },
  });

  if (enquiriesWithReplies.length === 0) return null;
  const total = enquiriesWithReplies.reduce((sum, e) => {
    const firstReply = e.replies[0];
    if (!firstReply) return sum;
    return sum + (firstReply.sentAt.getTime() - e.createdAt.getTime());
  }, 0);
  return total / enquiriesWithReplies.length;
}

async function getEnquiriesLast30Days() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const enquiries = await db.enquiry.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    counts[d.toISOString().split("T")[0]] = 0;
  }
  enquiries.forEach((e) => {
    const key = new Date(e.createdAt).toISOString().split("T")[0];
    if (key in counts) counts[key]++;
  });

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

async function getTopPackages() {
  const grouped = await db.enquiry.groupBy({
    by: ["packageId"],
    _count: true,
    where: { packageId: { not: null } },
    orderBy: { _count: { packageId: "desc" } },
    take: 5,
  });

  const packages = await db.package.findMany({
    where: { id: { in: grouped.map((g) => g.packageId!).filter(Boolean) } },
    include: { currentVersion: { select: { title: true } } },
  });

  return grouped.map((g) => {
    const pkg = packages.find((p) => p.id === g.packageId);
    return {
      packageId: g.packageId,
      title: pkg?.currentVersion?.title ?? "Unknown",
      count: g._count,
    };
  });
}
