import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { cacheLife } from "next/cache";
import { MapPin, Calendar, Star, ArrowRight, Compass, Shield, Clock } from "lucide-react";

export const instant = false;

async function getFeaturedPackages() {
  "use cache";
  cacheLife("minutes");

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
  const hero = packages[0];
  const rest = packages.slice(1);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero — cinematic full-bleed */}
      <section className="relative h-[92vh] min-h-[640px] flex items-end overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1920&h=1080&fit=crop&auto=format&q=85"
          alt="Kerala backwaters at golden hour"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <p className="text-[0.6875rem] font-semibold tracking-[0.15em] uppercase text-white/70 mb-4">
            Kerala · Tamil Nadu · Karnataka · Goa
          </p>
          <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.05] max-w-2xl tracking-tight">
            Travel that stays
            <br />
            <span className="text-forest-200">with you</span>
          </h1>
          <p className="mt-6 text-[17px] text-white/70 max-w-md leading-relaxed font-light">
            Handcrafted journeys through South India&apos;s backwaters, tea highlands,
            ancient temples, and golden coastlines.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center gap-2.5 bg-white text-forest-900 px-8 py-4 rounded-full font-semibold hover:bg-forest-50 transition-all text-sm tracking-wide"
            >
              Explore Packages
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/60 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Featured Package — editorial spotlight */}
      {hero?.currentVersion && (
        <section id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <p className="section-label mb-3">Editor&apos;s Pick</p>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold text-stone-900 mb-12">Start Here</h2>

          <Link href={`/packages/${hero.slug}`} className="group block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden bg-white border border-stone-200/60 hover:shadow-2xl transition-shadow duration-500">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] overflow-hidden">
                {(hero.currentVersion.photos as string[])?.[0] ? (
                  <img
                    src={(hero.currentVersion.photos as string[])[0]}
                    alt={hero.currentVersion.title}
                    className="absolute inset-0 w-full h-full object-cover img-zoom"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-forest-200 to-forest-400" />
                )}
              </div>
              <div className="p-8 lg:p-14 flex flex-col justify-center">
                <span className="text-xs font-medium text-forest-700 bg-forest-50 px-3 py-1 rounded-full w-fit tracking-wide">
                  {hero.currentVersion.destination} · {hero.currentVersion.days} Days
                </span>
                <h3 className="mt-5 text-2xl lg:text-[2rem] font-display font-semibold text-stone-900 group-hover:text-forest-700 transition leading-snug">
                  {hero.currentVersion.title}
                </h3>
                <p className="mt-4 text-stone-500 leading-relaxed line-clamp-3 text-[15px]">
                  {hero.currentVersion.description}
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div>
                    <span className="text-xs text-stone-400 uppercase tracking-wider">From</span>
                    <p className="text-2xl font-display font-bold text-forest-700 mt-0.5">
                      {formatPrice(Math.min(...hero.seasonalPrices.map((p) => p.pricePerPerson)))}
                      <span className="text-sm font-normal text-stone-400 ml-0.5">/person</span>
                    </p>
                  </div>
                  <span className="ml-auto text-sm text-forest-600 font-medium group-hover:text-forest-800 flex items-center gap-1.5 transition">
                    View Itinerary <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* More Packages — photo-forward cards */}
      <section className="bg-stone-50/80 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="section-label mb-2">Curated Routes</p>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold text-stone-900">More Journeys</h2>
            </div>
            <Link
              href="/packages"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-forest-700 hover:text-forest-800 font-medium link-slide"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((pkg, i) => {
              const v = pkg.currentVersion;
              if (!v) return null;
              const minPrice = Math.min(...pkg.seasonalPrices.map((p) => p.pricePerPerson));
              const photo = (v.photos as string[])?.[0];
              const isWide = i === 0;

              return (
                <Link
                  key={pkg.id}
                  href={`/packages/${pkg.slug}`}
                  className={`group bg-white rounded-2xl overflow-hidden hover:shadow-xl border border-stone-200/50 transition-all duration-500 ${
                    isWide ? "md:col-span-2" : ""
                  }`}
                >
                  <div className={`relative overflow-hidden ${isWide ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover img-zoom"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-forest-300 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-forest-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <h3 className="text-lg font-display font-semibold text-white drop-shadow-md line-clamp-1">
                          {v.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {v.destination}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {v.days} Days
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5" /> {v.hotelTier}
                          </span>
                        </div>
                      </div>
                      <div className="glass rounded-lg px-3 py-1.5 text-right shrink-0 ml-4">
                        <span className="text-[10px] text-stone-500 block">From</span>
                        <span className="text-sm font-bold text-forest-700">{formatPrice(minPrice)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 text-center sm:hidden">
            <Link
              href="/packages"
              className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-forest-800 font-medium"
            >
              View All Packages <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial mid-section — why Itera */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="rounded-2xl overflow-hidden aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&h=600&fit=crop&auto=format&q=80"
                  alt="Houseboat on Kerala backwaters"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -right-4 sm:right-4 glass rounded-xl px-5 py-4 border border-white/20 shadow-lg">
                <p className="text-2xl font-display font-bold text-forest-700">4,300+</p>
                <p className="text-xs text-stone-500">Journeys crafted last year</p>
              </div>
            </div>
            <div>
              <p className="section-label text-terracotta mb-3">Why Itera</p>
              <h2 className="text-3xl sm:text-4xl font-display font-semibold text-stone-900 leading-snug">
                We don&apos;t sell tours.
                <br />We craft memories.
              </h2>
              <p className="mt-6 text-stone-500 leading-relaxed text-[15px]">
                Every itinerary is built by people who live here — who know when the mist lifts
                in Munnar, which backwater route has the fewest boats, and where to find the best
                fish curry in Alleppey. We&apos;ve walked every trail and stayed in every hotel
                we recommend.
              </p>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center mb-3">
                    <Compass className="w-5 h-5 text-forest-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900">Local Expertise</h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">48 staff across 4 states</p>
                </div>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5 text-forest-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900">Honest Pricing</h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">GST inclusive, no hidden costs</p>
                </div>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-forest-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900">Quick Response</h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">Under 1 hour during business hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations band */}
      <section className="bg-forest-950 py-24 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-forest-400 mb-3 text-center">Destinations</p>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold mb-12 text-center">Explore by Region</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Kerala", img: "photo-1602216056096-3b40cc0c9944", tag: "Backwaters & Hills" },
              { name: "Tamil Nadu", img: "photo-1692173248120-59547c3d4653", tag: "Temples & Culture" },
              { name: "Karnataka", img: "photo-1600112356915-089abb8fc71a", tag: "Coffee & Palaces" },
              { name: "Goa", img: "photo-1590393275627-0c48482c60e3", tag: "Beaches & Heritage" },
            ].map((region) => (
              <Link
                key={region.name}
                href={`/packages?destination=${encodeURIComponent(region.name)}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
              >
                <img
                  src={`https://images.unsplash.com/${region.img}?w=400&h=540&fit=crop&auto=format&q=80`}
                  alt={region.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover img-zoom"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <h3 className="text-xl font-display font-semibold tracking-tight">{region.name}</h3>
                  <p className="text-xs text-white/60 mt-0.5">{region.tag}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-label mb-3">Get Started</p>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold text-stone-900">Ready to plan your trip?</h2>
          <p className="mt-4 text-stone-500 text-[15px] leading-relaxed">
            Tell us your dates, group size, and interests — we&apos;ll handle the rest.
          </p>
          <Link
            href="/packages"
            className="mt-10 inline-flex items-center gap-2.5 bg-forest-700 text-white px-8 py-4 rounded-full font-semibold hover:bg-forest-800 transition-all text-sm tracking-wide"
          >
            Browse Packages <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
