"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Star, Search, SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Package = {
  id: string;
  slug: string;
  currentVersion: {
    title: string;
    destination: string;
    days: number;
    description: string;
    hotelTier: string;
    photos?: string[];
  } | null;
  seasonalPrices: { pricePerPerson: number; seasonName: string }[];
  _count: { enquiries: number };
};

export function PackageGrid({
  packages,
  destinations,
  initialSearch,
  initialDestination = "",
  initialMaxBudget,
  initialSort,
}: {
  packages: Package[];
  destinations: string[];
  initialSearch?: string;
  initialDestination?: string;
  initialMaxBudget?: string;
  initialSort?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch ?? "");
  const [destination, setDestination] = useState(initialDestination);
  const [maxBudget, setMaxBudget] = useState(initialMaxBudget ?? "");
  const [sort, setSort] = useState(initialSort ?? "price-asc");
  const [showFilters, setShowFilters] = useState(false);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (destination) params.set("destination", destination);
    if (maxBudget) params.set("maxBudget", maxBudget);
    if (sort !== "price-asc") params.set("sort", sort);
    const query = params.toString();
    router.push(query ? `/packages?${query}` : "/packages");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search & Filter Bar */}
      <form onSubmit={applyFilters} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-sand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center gap-2 px-4 py-2.5 border border-sand-200 rounded-lg text-sm text-stone-600"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <div className={`${showFilters ? "flex" : "hidden"} sm:flex gap-3 flex-wrap`}>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="px-3 py-2.5 border border-sand-200 rounded-lg text-sm text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="">All Destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Max budget/person"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            className="w-40 px-3 py-2.5 border border-sand-200 rounded-lg text-sm text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 border border-sand-200 rounded-lg text-sm text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="days-asc">Duration: Short First</option>
            <option value="days-desc">Duration: Long First</option>
          </select>
          <button type="submit" className="px-4 py-2.5 rounded-lg bg-forest-700 text-sm font-medium text-white hover:bg-forest-800">
            Search
          </button>
        </div>
      </form>

      {/* Results count */}
      <p className="text-sm text-stone-500 mb-4">
        {packages.length} package{packages.length !== 1 ? "s" : ""} found
      </p>

      {/* Grid */}
      {packages.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-500">No packages match your search.</p>
          <button
            onClick={() => router.push("/packages")}
            className="mt-3 text-sm text-forest-700 hover:text-forest-800 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const v = pkg.currentVersion!;
            const minPrice = Math.min(...pkg.seasonalPrices.map((p) => p.pricePerPerson));
            const photo = v.photos?.[0];

            return (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.slug}`}
                className="group bg-white rounded-2xl border border-stone-200/50 overflow-hidden hover:shadow-xl transition-all duration-500"
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  {photo ? (
                    <img src={photo} alt={v.title} className="absolute inset-0 w-full h-full object-cover img-zoom" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-forest-200 flex items-center justify-center text-forest-300">
                      <MapPin className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="glass text-xs font-medium text-forest-800 px-2.5 py-1 rounded-full border border-white/20">
                      {v.destination}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display font-semibold text-stone-900 group-hover:text-forest-700 transition line-clamp-1 text-[15px]">
                    {v.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {v.days} Days
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" /> {v.hotelTier}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-stone-500 line-clamp-2 leading-relaxed">
                    {v.description}
                  </p>
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider">From</span>
                      <p className="text-lg font-display font-bold text-forest-700">
                        {formatPrice(minPrice)}
                        <span className="text-xs font-normal text-stone-400 ml-0.5">/person</span>
                      </p>
                    </div>
                    <span className="text-xs text-forest-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
