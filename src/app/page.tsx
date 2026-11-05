import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { MapPin, Calendar, Star, ArrowRight } from "lucide-react";

export const instant = false;

async function getFeaturedPackages() {
  return db.package.findMany({
    where: { status: "PUBLISHED" },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" } },
    },
    take: 6,
    orderBy: { updatedAt: "desc" },
  });
}

export default async function HomePage() {
  const packages = await getFeaturedPackages();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
            Discover South India
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-teal-100 leading-relaxed">
            Houseboats on quiet backwaters. Tea gardens in the mist. Temples that
            have stood for centuries. Handcrafted by local experts who know every trail.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center gap-2 bg-white text-teal-800 px-6 py-3 rounded-lg font-medium hover:bg-teal-50 transition text-sm"
            >
              Explore Packages
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Packages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Popular Packages</h2>
            <p className="text-slate-500 mt-1">Curated journeys across Kerala and South India</p>
          </div>
          <Link
            href="/packages"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const v = pkg.currentVersion;
            if (!v) return null;
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
                  <div className="absolute bottom-3 left-3">
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
                      <Calendar className="w-3.5 h-3.5" />
                      {v.days} Days
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" />
                      {v.hotelTier}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {v.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
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

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/packages"
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            View All Packages <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Local Expertise",
                desc: "48 staff who've walked every trail, stayed in every hotel, and know the best-kept secrets of South India.",
              },
              {
                title: "Honest Pricing",
                desc: "Per-person pricing, twin sharing, GST included. No hidden costs. The price you see is the price you pay.",
              },
              {
                title: "Quick Response",
                desc: "Every enquiry answered within the hour during working hours. Your trip planning starts the moment you reach out.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center md:text-left">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
