import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { cacheLife } from "next/cache";
import { MapPin, Calendar, Star, ArrowRight } from "lucide-react";
import { isSeoImageUrl } from "@/lib/seo";

async function getFeaturedPackages() {
  "use cache";
  cacheLife("minutes");

  return db.package.findMany({
    where: { status: "PUBLISHED" },
    include: {
      currentVersion: {
        select: {
          title: true,
          destination: true,
          days: true,
          itinerary: true,
          description: true,
          hotelTier: true,
          photos: true,
        },
      },
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" } },
    },
    take: 6,
    orderBy: { updatedAt: "desc" },
  });
}

export async function HomePackageSections() {
  const packages = await getFeaturedPackages();
  const hero = packages[0];
  const rest = packages.slice(1);

  return (
    <>
      {hero?.currentVersion && (
        <section id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <p className="section-label mb-3">Editor&apos;s Pick</p>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold text-stone-900 mb-12">Start Here</h2>
          <Link href={`/packages/${hero.slug}`} className="group block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden bg-white border border-stone-200/60 hover:shadow-2xl transition-shadow duration-500">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] overflow-hidden">
                {(hero.currentVersion.photos as string[])?.[0] ? (
                  isSeoImageUrl((hero.currentVersion.photos as string[])[0]) ? (
                    <Image
                      src={(hero.currentVersion.photos as string[])[0]}
                      alt={hero.currentVersion.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover img-zoom"
                    />
                  ) : (
                    <img
                      src={(hero.currentVersion.photos as string[])[0]}
                      alt={hero.currentVersion.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover img-zoom"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-forest-200 to-forest-400" />
                )}
              </div>
              <div className="p-8 lg:p-14 flex flex-col justify-center">
                <span className="text-xs font-medium text-forest-700 bg-forest-50 px-3 py-1 rounded-full w-fit tracking-wide">
                  {hero.currentVersion.destination} · {(Array.isArray(hero.currentVersion.itinerary) ? hero.currentVersion.itinerary.length : hero.currentVersion.days)} Days
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
                      {formatPrice(Math.min(...hero.seasonalPrices.map((price) => price.pricePerPerson)))}
                    </p>
                    <span className="text-xs text-stone-400">{hero.seasonalPrices[0]?.basis ?? "Per person, twin sharing"}</span>
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

      <section className="bg-stone-50/80 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="section-label mb-2">Curated Routes</p>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold text-stone-900">More Journeys</h2>
            </div>
            <Link href="/packages" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-forest-700 hover:text-forest-800 font-medium link-slide">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((pkg, index) => {
              const version = pkg.currentVersion;
              if (!version) return null;
              const minPrice = Math.min(...pkg.seasonalPrices.map((price) => price.pricePerPerson));
              const photo = (version.photos as string[])?.[0];
              const isWide = index === 0;

              return (
                <Link
                  key={pkg.id}
                  href={`/packages/${pkg.slug}`}
                  className={`group bg-white rounded-2xl overflow-hidden hover:shadow-xl border border-stone-200/50 transition-all duration-500 ${isWide ? "md:col-span-2" : ""}`}
                >
                  <div className={`relative overflow-hidden ${isWide ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
                    {photo ? (
                      isSeoImageUrl(photo) ? (
                        <Image
                          src={photo}
                          alt={version.title}
                          fill
                          sizes={isWide ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                          className="object-cover img-zoom"
                        />
                      ) : (
                        <img src={photo} alt={version.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover img-zoom" />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-forest-300 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-forest-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <h3 className="text-lg font-display font-semibold text-white drop-shadow-md line-clamp-1">{version.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {version.destination}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {(Array.isArray(version.itinerary) ? version.itinerary.length : version.days)} Days</span>
                          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {version.hotelTier}</span>
                        </div>
                      </div>
                      <div className="glass rounded-lg px-3 py-1.5 text-right shrink-0 ml-4">
                        <span className="text-[10px] text-stone-500 block">From</span>
                        <span className="text-sm font-bold text-forest-700">{formatPrice(minPrice)}</span>
                        <span className="text-[10px] text-stone-400 block">{pkg.seasonalPrices[0]?.basis ?? "Per person, twin sharing"}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 text-center sm:hidden">
            <Link href="/packages" className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-forest-800 font-medium">
              View All Packages <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
