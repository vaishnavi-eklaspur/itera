import { db } from "@/lib/db";
import Link from "next/link";
import { Package, Inbox, BarChart3, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export const instant = false;

export default async function AdminDashboard() {
  const [packageCount, enquiryCount, newEnquiries, recentEnquiries] = await Promise.all([
    db.package.count(),
    db.enquiry.count(),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.enquiry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Packages" value={packageCount} href="/admin/packages" />
        <StatCard icon={Inbox} label="Total Enquiries" value={enquiryCount} href="/admin/enquiries" />
        <StatCard icon={Clock} label="New Enquiries" value={newEnquiries} href="/admin/enquiries?status=NEW" accent />
        <StatCard icon={BarChart3} label="Analytics" value="View" href="/admin/analytics" />
      </div>

      {/* Recent enquiries */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Enquiries</h2>
          <Link href="/admin/enquiries" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            View All
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentEnquiries.map((e) => (
            <Link key={e.id} href={`/admin/enquiries/${e.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
              <div>
                <p className="text-sm font-medium text-slate-700">{e.name}</p>
                <p className="text-xs text-slate-400">{e.email}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  e.status === "NEW" ? "bg-amber-100 text-amber-700" :
                  e.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                  e.status === "REPLIED" ? "bg-green-100 text-green-700" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {e.status}
                </span>
                <p className="text-xs text-slate-400 mt-1">{timeAgo(e.createdAt)}</p>
              </div>
            </Link>
          ))}
          {recentEnquiries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No enquiries yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; href: string; accent?: boolean;
}) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-200 hover:shadow-sm transition">
      <Icon className={`w-5 h-5 ${accent ? "text-amber-500" : "text-teal-600"} mb-2`} />
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </Link>
  );
}
