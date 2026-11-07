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
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-forest-800 to-forest-900 rounded-2xl p-6 sm:p-8 mb-8 text-white">
        <h1 className="text-xl font-display font-semibold tracking-tight">Good to see you</h1>
        <p className="text-forest-300 text-sm mt-1">
          {newEnquiries > 0
            ? `You have ${newEnquiries} new enquir${newEnquiries === 1 ? "y" : "ies"} to review.`
            : "All caught up — no new enquiries."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Packages" value={packageCount} href="/admin/packages" />
        <StatCard icon={Inbox} label="Total Enquiries" value={enquiryCount} href="/admin/enquiries" />
        <StatCard icon={Clock} label="New Enquiries" value={newEnquiries} href="/admin/enquiries?status=NEW" accent />
        <StatCard icon={BarChart3} label="Analytics" value="View" href="/admin/analytics" />
      </div>

      {/* Recent enquiries */}
      <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100/80">
          <h2 className="font-semibold text-stone-900">Recent Enquiries</h2>
          <Link href="/admin/enquiries" className="text-xs text-forest-700 hover:text-forest-800 font-medium">
            View All
          </Link>
        </div>
        <div className="divide-y divide-stone-50">
          {recentEnquiries.map((e) => (
            <Link key={e.id} href={`/admin/enquiries/${e.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition">
              <div>
                <p className="text-sm font-medium text-stone-700">{e.name}</p>
                <p className="text-xs text-stone-400">{e.email}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  e.status === "NEW" ? "bg-amber-100 text-amber-700" :
                  e.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                  e.status === "REPLIED" ? "bg-green-100 text-green-700" :
                  "bg-stone-100 text-stone-500"
                }`}>
                  {e.status}
                </span>
                <p className="text-xs text-stone-400 mt-1">{timeAgo(e.createdAt)}</p>
              </div>
            </Link>
          ))}
          {recentEnquiries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-stone-400">No enquiries yet</p>
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
    <Link href={href} className="bg-white rounded-xl border border-stone-200/60 p-5 hover:border-forest-200 hover:shadow-sm transition group">
      <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center mb-3 group-hover:bg-forest-100 transition">
        <Icon className={`w-4 h-4 ${accent ? "text-amber-500" : "text-forest-600"}`} />
      </div>
      <p className="text-2xl font-bold text-stone-900 tracking-tight">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{label}</p>
    </Link>
  );
}
