import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PackageGrid } from "@/components/packages/package-grid";
import { db } from "@/lib/db";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel Packages",
  description: "Explore handcrafted holiday packages across Kerala, Tamil Nadu, Karnataka and Goa.",
};

export const instant = false;

async function getPackages(filters: {
  q?: string;
  destination?: string;
  maxBudget?: string;
  sort?: string;
}) {
  "use cache";
  cacheLife("minutes");

  const maxBudget = filters.maxBudget ? Number.parseInt(filters.maxBudget, 10) : NaN;
  const packages = await db.package.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        ...(filters.destination
          ? [{ currentVersion: { destination: { contains: filters.destination, mode: "insensitive" as const } } }]
          : []),
        ...(filters.q
          ? [{
              currentVersion: {
                OR: [
                  { title: { contains: filters.q, mode: "insensitive" as const } },
                  { destination: { contains: filters.q, mode: "insensitive" as const } },
                  { description: { contains: filters.q, mode: "insensitive" as const } },
                ],
              },
            }]
          : []),
      ],
      ...(Number.isFinite(maxBudget) && maxBudget >= 0
        ? { seasonalPrices: { some: { isActive: true, pricePerPerson: { lte: maxBudget } } } }
        : {}),
    },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" } },
      _count: { select: { enquiries: true } },
    },
  });

  return packages.sort((a, b) => {
    const aMin = Math.min(...a.seasonalPrices.map((price) => price.pricePerPerson));
    const bMin = Math.min(...b.seasonalPrices.map((price) => price.pricePerPerson));
    switch (filters.sort) {
      case "price-desc": return bMin - aMin;
      case "days-asc": return (a.currentVersion?.days ?? 0) - (b.currentVersion?.days ?? 0);
      case "days-desc": return (b.currentVersion?.days ?? 0) - (a.currentVersion?.days ?? 0);
      default: return aMin - bMin;
    }
  });
}

async function getDestinations() {
  "use cache";
  cacheLife("minutes");

  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    select: { currentVersion: { select: { destination: true } } },
  });
  return [...new Set(packages.map((p) => p.currentVersion?.destination).filter(Boolean))] as string[];
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; destination?: string; maxBudget?: string; sort?: string }>;
}) {
  const filters = await searchParams;
  const [packages, destinations] = await Promise.all([getPackages(filters), getDestinations()]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="relative z-10 flex-1 bg-ivory">
        {/* Hero — photo-led */}
        <div className="relative z-0 isolate h-[44vh] min-h-[300px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1280&h=500&fit=crop&auto=format&q=60"
            alt="South India landscape"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
          <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-[0.15em] uppercase text-white/70 mb-3">All Packages</p>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight">Explore South India</h1>
              <p className="mt-3 text-[15px] text-white/70 max-w-lg">
                {packages.length} handcrafted journeys through Kerala, Tamil Nadu, Karnataka &amp; Goa
              </p>
            </div>
          </div>
        </div>
        <PackageGrid
          packages={JSON.parse(JSON.stringify(packages))}
          destinations={destinations}
          initialSearch={filters.q}
          initialDestination={filters.destination}
          initialMaxBudget={filters.maxBudget}
          initialSort={filters.sort}
        />
      </main>
      <Footer />
    </div>
  );
}
