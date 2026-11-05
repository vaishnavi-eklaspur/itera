"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { MapPin, Calendar, Star, Search, SlidersHorizontal, X } from "lucide-react";
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
  } | null;
  seasonalPrices: { pricePerPerson: number; seasonName: string }[];
  _count: { enquiries: number };
};

export function PackageGrid({
  packages,
  destinations,
}: {
  packages: Package[];
  destinations: string[];
}) {
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [sort, setSort] = useState("price-asc");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = packages.filter((p) => p.currentVersion);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.currentVersion!.title.toLowerCase().includes(q) ||
          p.currentVersion!.destination.toLowerCase().includes(q) ||
          p.currentVersion!.description.toLowerCase().includes(q)
      );
    }

    if (destination) {
      result = result.filter(
        (p) => p.currentVersion!.destination === destination
      );
    }

    if (maxBudget) {
      const limit = parseInt(maxBudget);
      if (!isNaN(limit)) {
        result = result.filter((p) =>
          Math.min(...p.seasonalPrices.map((s) => s.pricePerPerson)) <= limit
        );
      }
    }

    result.sort((a, b) => {
      const aMin = Math.min(...a.seasonalPrices.map((p) => p.pricePerPerson));
      const bMin = Math.min(...b.seasonalPrices.map((p) => p.pricePerPerson));
      switch (sort) {
        case "price-desc": return bMin - aMin;
        case "days-asc": return a.currentVersion!.days - b.currentVersion!.days;
        case "days-desc": return b.currentVersion!.days - a.currentVersion!.days;
        default: return aMin - bMin;
      }
    });

    return result;
  }, [packages, search, destination, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <div className={`${showFilters ? "flex" : "hidden"} sm:flex gap-3 flex-wrap`}>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="days-asc">Duration: Short First</option>
            <option value="days-desc">Duration: Long First</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500 mb-4">
        {filtered.length} package{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500">No packages match your search.</p>
          <button
            onClick={() => { setSearch(""); setDestination(""); setMaxBudget(""); }}
            className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pkg) => {
            const v = pkg.currentVersion!;
            const minPrice = Math.min(...pkg.seasonalPrices.map((p) => p.pricePerPerson));

            return (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.slug}`}
                className="group bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all duration-200"
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-teal-100 to-emerald-100 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-teal-300">
                    <MapPin className="w-12 h-12" />
                  </div>
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-sm text-xs font-medium text-teal-700 px-2.5 py-1 rounded-full">
                      {v.destination}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition line-clamp-1">
                    {v.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {v.days} Days
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" /> {v.hotelTier}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {v.description}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">From</span>
                      <p className="text-lg font-semibold text-teal-700">
                        {formatPrice(minPrice)}
                        <span className="text-xs font-normal text-slate-400">/person</span>
                      </p>
                    </div>
                    <span className="text-xs text-teal-600 font-medium group-hover:underline">
                      View Details →
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
