import { db } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatPrice, timeAgo } from "@/lib/utils";
import { requireAdminRole } from "@/lib/admin-access";

export const instant = false;

export default async function AdminPackagesPage() {
  const session = await requireAdminRole("ADMIN", "CONSULTANT");
  const packages = await db.package.findMany({
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" }, take: 1 },
      _count: { select: { enquiries: true, versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-stone-900">Packages</h1>
        {session.user.role === "ADMIN" && (
          <Link
            href="/admin/packages/new"
            className="flex items-center gap-1.5 bg-forest-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-700 transition"
          >
            <Plus className="w-4 h-4" /> New Package
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-5 py-3 text-stone-500 font-medium">Package</th>
                <th className="text-left px-5 py-3 text-stone-500 font-medium hidden sm:table-cell">Status</th>
                <th className="text-right px-5 py-3 text-stone-500 font-medium hidden md:table-cell">From Price</th>
                <th className="text-right px-5 py-3 text-stone-500 font-medium hidden lg:table-cell">Enquiries</th>
                <th className="text-right px-5 py-3 text-stone-500 font-medium hidden lg:table-cell">Versions</th>
                <th className="text-right px-5 py-3 text-stone-500 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {packages.map((pkg) => {
                const v = pkg.currentVersion;
                return (
                  <tr key={pkg.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-3">
                      <Link href={`/admin/packages/${pkg.id}`} className="font-medium text-stone-700 hover:text-forest-700">
                        {v?.title ?? pkg.slug}
                      </Link>
                      <p className="text-xs text-stone-400">{v?.destination} · {v?.days} days</p>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        pkg.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                        pkg.status === "DRAFT" ? "bg-amber-100 text-amber-700" :
                        "bg-stone-100 text-stone-500"
                      }`}>
                        {pkg.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right hidden md:table-cell text-stone-600">
                      {pkg.seasonalPrices[0] ? formatPrice(pkg.seasonalPrices[0].pricePerPerson) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right hidden lg:table-cell text-stone-400">
                      {pkg._count.enquiries}
                    </td>
                    <td className="px-5 py-3 text-right hidden lg:table-cell text-stone-400">
                      {pkg._count.versions}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-stone-400">
                      {timeAgo(pkg.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {packages.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-stone-400">No packages yet. Create your first one.</p>
        )}
      </div>
    </div>
  );
}
