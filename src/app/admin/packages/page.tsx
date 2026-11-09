import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { formatPrice, timeAgo } from "@/lib/utils";
import { requireAdminRole } from "@/lib/admin-access";
import { PackageListActions } from "@/components/admin/package-list-actions";

export const instant = false;

const statusTabs = ["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const;
type StatusTab = (typeof statusTabs)[number];

function getStatusTab(value: string | string[] | undefined): StatusTab {
  const status = Array.isArray(value) ? value[0] : value;
  return statusTabs.find((tab) => tab === status) ?? "ALL";
}

function tabHref(status: StatusTab, query: string) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/packages?${search}` : "/admin/packages";
}

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; q?: string | string[] }>;
}) {
  const session = await requireAdminRole("ADMIN", "CONSULTANT");
  const params = await searchParams;
  const status = getStatusTab(params.status);
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim().slice(0, 100) ?? "";

  const searchFilter = query
    ? {
        OR: [
          { slug: { contains: query, mode: "insensitive" as const } },
          { currentVersion: { is: { title: { contains: query, mode: "insensitive" as const } } } },
          { currentVersion: { is: { destination: { contains: query, mode: "insensitive" as const } } } },
        ],
      }
    : {};
  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...searchFilter,
  };

  const [packages, groupedCounts] = await Promise.all([
    db.package.findMany({
      where,
      include: {
        currentVersion: true,
        seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" }, take: 1 },
        _count: { select: { enquiries: true, versions: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.package.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);
  const counts = {
    ALL: groupedCounts.reduce((total, group) => total + group._count._all, 0),
    PUBLISHED: groupedCounts.find((group) => group.status === "PUBLISHED")?._count._all ?? 0,
    DRAFT: groupedCounts.find((group) => group.status === "DRAFT")?._count._all ?? 0,
    ARCHIVED: groupedCounts.find((group) => group.status === "ARCHIVED")?._count._all ?? 0,
  };

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

      <div className="mb-5 flex flex-col gap-4">
        <nav aria-label="Filter packages by status" className="flex gap-2 overflow-x-auto">
          {statusTabs.map((tab) => (
            <Link
              key={tab}
              href={tabHref(tab, query)}
              aria-current={status === tab ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
                status === tab
                  ? "bg-forest-700 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
              }`}
            >
              {tab === "ALL" ? "All" : `${tab.charAt(0)}${tab.slice(1).toLowerCase()}`}
              <span className={`ml-1.5 text-xs ${status === tab ? "text-forest-100" : "text-stone-400"}`}>
                {counts[tab]}
              </span>
            </Link>
          ))}
        </nav>

        <form action="/admin/packages" method="GET" className="flex w-full max-w-xl gap-2">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <label htmlFor="package-search" className="sr-only">Search packages</label>
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="package-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search title, destination, or slug"
              maxLength={100}
              className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            />
          </div>
          <button type="submit" className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
            Search
          </button>
          {query && (
            <Link href={tabHref(status, "")} className="self-center text-sm text-stone-500 hover:text-stone-800">
              Clear
            </Link>
          )}
        </form>
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
                <th className="text-right px-5 py-3 text-stone-500 font-medium hidden sm:table-cell">Updated</th>
                <th className="px-5 py-3 text-right text-stone-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {packages.map((pkg) => {
                const version = pkg.currentVersion;
                return (
                  <tr key={pkg.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-3">
                      <Link href={`/admin/packages/${pkg.id}`} className="font-medium text-stone-700 hover:text-forest-700">
                        {version?.title ?? pkg.slug}
                      </Link>
                      <p className="text-xs text-stone-400">{version?.destination} · {version?.days} days</p>
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
                    <td className="px-5 py-3 text-right text-xs text-stone-400 hidden sm:table-cell">
                      {timeAgo(pkg.updatedAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <PackageListActions
                        id={pkg.id}
                        slug={pkg.slug}
                        status={pkg.status}
                        canManage={session.user.role === "ADMIN"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {packages.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-stone-400">
            {query || status !== "ALL" ? "No packages match these filters." : "No packages yet. Create your first one."}
          </p>
        )}
      </div>
    </div>
  );
}
