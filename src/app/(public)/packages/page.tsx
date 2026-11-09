import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import Image from "next/image";
import { Footer } from "@/components/layout/footer";
import { PackageGrid } from "@/components/packages/package-grid";
import { db } from "@/lib/db";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { activeSeasonalPriceWhere, buildPackageWhere, type PackageSearchFilters } from "@/lib/package-search";

export const metadata: Metadata = {
  title: "Travel Packages",
  description: "Explore handcrafted holiday packages across Kerala, Tamil Nadu, Karnataka and Goa.",
  alternates: { canonical: "/packages" },
};

export const instant = false;

async function getPackages(filters: PackageSearchFilters & { sort?: string }) {
  "use cache";
  cacheLife("minutes");

  const packages = await db.package.findMany({
    where: buildPackageWhere(filters),
    include: {
      currentVersion: {
        select: {
          title: true,
          destination: true,
          days: true,
          description: true,
          hotelTier: true,
          photos: true,
        },
      },
      seasonalPrices: { where: activeSeasonalPriceWhere(filters), orderBy: { pricePerPerson: "asc" } },
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
      case "popularity": return b._count.enquiries - a._count.enquiries;
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

async function getFilterOptions() {
  "use cache";
  cacheLife("minutes");

  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    select: {
      currentVersion: { select: { hotelTier: true } },
      seasonalPrices: { where: { isActive: true }, select: { seasonName: true } },
    },
  });
  return {
    hotelTiers: [...new Set(packages.map((pkg) => pkg.currentVersion?.hotelTier).filter(Boolean))].sort() as string[],
    seasons: [...new Set(packages.flatMap((pkg) => pkg.seasonalPrices.map((price) => price.seasonName)))].sort(),
  };
}

async function PackageResults({
  searchParams,
}: {
  searchParams: Promise<PackageSearchFilters & { sort?: string }>;
}) {
  const filters = await searchParams;
  const [packages, destinations, filterOptions] = await Promise.all([
    getPackages(filters),
    getDestinations(),
    getFilterOptions(),
  ]);

  return (
    <PackageGrid
      key={JSON.stringify(filters)}
      packages={JSON.parse(JSON.stringify(packages))}
      destinations={destinations}
      initialSearch={filters.q}
      initialDestination={filters.destination}
      initialMinDays={filters.minDays}
      initialMaxDays={filters.maxDays}
      initialMaxBudget={filters.maxBudget}
      initialHotelTier={filters.hotelTier}
      initialSeason={filters.season}
      initialSort={filters.sort}
      hotelTiers={filterOptions.hotelTiers}
      seasons={filterOptions.seasons}
    />
  );
}

export default function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<PackageSearchFilters & { sort?: string }>;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="relative z-10 flex-1 bg-ivory">
        <div className="relative z-0 isolate h-[44vh] min-h-[300px] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1280&h=500&fit=crop&auto=format&q=60"
            alt="South India landscape"
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
          <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-[0.15em] uppercase text-white/70 mb-3">All Packages</p>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight">Explore South India</h1>
              <p className="mt-3 text-[15px] text-white/70 max-w-lg">
                Handcrafted journeys through Kerala, Tamil Nadu, Karnataka &amp; Goa
              </p>
            </div>
          </div>
        </div>
        <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
          <PackageResults searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
