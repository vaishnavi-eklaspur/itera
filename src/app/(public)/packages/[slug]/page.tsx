import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { EnquiryForm } from "@/components/packages/enquiry-form";
import { PriceEstimator } from "@/components/packages/price-estimator";
import { ItinerarySection } from "@/components/packages/itinerary-section";
import { PhotoGallery } from "@/components/packages/photo-gallery";
import { Check, X as XIcon, Calendar, Star, Users, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export const instant = false;

async function getPackage(slug: string) {
  return db.package.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackage(slug);
  if (!pkg?.currentVersion) return { title: "Package Not Found" };
  const v = pkg.currentVersion;
  const minPrice = pkg.seasonalPrices.length ? Math.min(...pkg.seasonalPrices.map((p) => p.pricePerPerson)) : 0;
  return {
    title: v.title,
    description: v.description.slice(0, 160),
    openGraph: {
      title: `${v.title} — ${v.days} Days in ${v.destination}`,
      description: v.description.slice(0, 160),
      type: "website",
    },
    other: {
      "product:price:amount": String(minPrice),
      "product:price:currency": "INR",
    },
  };
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await getPackage(slug);

  if (!pkg?.currentVersion) notFound();

  const v = pkg.currentVersion;
  const minPrice = Math.min(...pkg.seasonalPrices.map((p) => p.pricePerPerson));
  const itinerary = v.itinerary as {
    day: number;
    title: string;
    location: string;
    lat: number;
    lng: number;
    description: string;
    activities: string[];
  }[];

  const relatedPackages = await db.package.findMany({
    where: { status: "PUBLISHED", slug: { not: slug } },
    include: {
      currentVersion: { select: { title: true, destination: true, days: true, description: true, photos: true } },
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" }, take: 1 },
    },
    take: 3,
    orderBy: { updatedAt: "desc" },
  });

  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in the "${v.title}" package (${v.days} days). Could you share more details?`
  );

  const base = process.env.NEXTAUTH_URL || "https://itera.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: v.title,
    description: v.description,
    touristType: "Leisure",
    itinerary: {
      "@type": "ItemList",
      numberOfItems: v.days,
      itemListElement: itinerary.map((day) => ({
        "@type": "ListItem",
        position: day.day,
        name: day.title,
        description: day.description,
      })),
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: minPrice,
      highPrice: Math.max(...pkg.seasonalPrices.map((p) => p.pricePerPerson)),
      offerCount: pkg.seasonalPrices.length,
    },
    provider: {
      "@type": "TravelAgency",
      name: "Itera",
      url: base,
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero — cinematic photo */}
      <div className="relative h-[55vh] min-h-[420px] overflow-hidden">
        {(v.photos as string[])?.[0] ? (
          <img
            src={(v.photos as string[])[0]}
            alt={v.title}
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <MapPin className="w-4 h-4" />
              <span className="text-[0.6875rem] font-semibold tracking-[0.15em] uppercase text-white/70">{v.destination}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight">{v.title}</h1>
            <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {v.days} Days / {v.days - 1} Nights
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4" /> {v.hotelTier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile price bar */}
      <div className="lg:hidden sticky top-[60px] z-40 bg-ivory/90 backdrop-blur-lg border-b border-stone-200/40 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-stone-400 uppercase tracking-wider">From</span>
          <p className="text-lg font-display font-bold text-forest-700">{formatPrice(minPrice)}<span className="text-xs font-normal text-stone-400 ml-0.5">/person</span></p>
        </div>
        <a href="#enquiry-form" className="bg-forest-700 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-forest-800 transition">
          Enquire Now
        </a>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section>
              <p className="text-stone-600 leading-relaxed">{v.description}</p>
            </section>

            {/* Photo Gallery */}
            <PhotoGallery photos={v.photos} />

            {/* Quick facts */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Calendar, label: "Duration", value: `${v.days} Days` },
                { icon: Star, label: "Hotels", value: v.hotelTier },
                { icon: Users, label: "Group Size", value: "2–20 pax" },
                { icon: MapPin, label: "Destinations", value: `${new Set(itinerary.map(d => d.location)).size} places` },
              ].map((fact) => (
                <div key={fact.label} className="bg-white rounded-xl border border-stone-200/50 p-4 text-center">
                  <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center mx-auto mb-2">
                    <fact.icon className="w-4 h-4 text-forest-600" />
                  </div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">{fact.label}</p>
                  <p className="text-sm font-semibold text-stone-800 mt-0.5">{fact.value}</p>
                </div>
              ))}
            </section>

            {/* Price Estimator */}
            <PriceEstimator
              prices={JSON.parse(JSON.stringify(pkg.seasonalPrices))}
            />

            {/* Seasonal Pricing Table */}
            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">Seasonal Pricing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sand-200">
                      <th className="text-left py-3 text-stone-500 font-medium">Season</th>
                      <th className="text-left py-3 text-stone-500 font-medium">Months</th>
                      <th className="text-right py-3 text-stone-500 font-medium">Price/Person</th>
                      <th className="text-right py-3 text-stone-500 font-medium">Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.seasonalPrices.map((price) => {
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const range = price.seasonStartMonth === 1 && price.seasonEndMonth === 12
                        ? "All Year"
                        : `${months[price.seasonStartMonth - 1]} – ${months[price.seasonEndMonth - 1]}`;

                      return (
                        <tr key={price.id} className="border-b border-sand-200/40">
                          <td className="py-3 font-medium text-stone-700">{price.seasonName}</td>
                          <td className="py-3 text-stone-500">{range}</td>
                          <td className="py-3 text-right font-semibold text-forest-700">{formatPrice(price.pricePerPerson)}</td>
                          <td className="py-3 text-right text-stone-400 text-xs">{price.basis}{price.gstInclusive ? ", GST incl." : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Itinerary */}
            <ItinerarySection itinerary={itinerary} />

            {/* Inclusions / Exclusions */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-stone-900 mb-3">Inclusions</h2>
                <ul className="space-y-2">
                  {v.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                      <Check className="w-4 h-4 text-forest-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-stone-900 mb-3">Exclusions</h2>
                <ul className="space-y-2">
                  {v.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-400">
                      <XIcon className="w-4 h-4 text-stone-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="sticky top-20 space-y-6">
              {/* Price Card */}
              <div className="hidden lg:block bg-white rounded-2xl border border-stone-200/50 p-6">
                <div className="text-center mb-5">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">Starting from</span>
                  <p className="text-3xl font-display font-bold text-forest-700 mt-1">{formatPrice(minPrice)}</p>
                  <span className="text-xs text-stone-400">per person, twin sharing</span>
                </div>
                <a
                  href="#enquiry-form"
                  className="block w-full bg-forest-700 text-white text-center py-3.5 rounded-full font-medium hover:bg-forest-800 transition text-sm"
                >
                  Enquire Now
                </a>
              </div>

              {/* Enquiry Form */}
              <div id="enquiry-form">
                <EnquiryForm
                  packageId={pkg.id}
                  packageTitle={v.title}
                />
              </div>

              {/* WhatsApp Button */}
              <a
                href={`https://wa.me/919847012345?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Enquire on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Related Packages */}
      {relatedPackages.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 border-t border-sand-200/60">
          <h2 className="text-2xl font-display font-semibold text-stone-900 mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPackages.map((rp) => {
              const rv = rp.currentVersion;
              if (!rv) return null;
              const rpPrice = rp.seasonalPrices[0]?.pricePerPerson;
              return (
                <Link key={rp.id} href={`/packages/${rp.slug}`} className="group bg-white rounded-xl border border-sand-200/60 overflow-hidden hover:shadow-lg hover:border-sand-300 transition-all">
                  <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-forest-100 to-forest-200">
                    {(rv.photos as string[])?.[0] ? (
                      <img src={(rv.photos as string[])[0]} alt={rv.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center"><MapPin className="w-10 h-10 text-forest-300" /></div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-stone-900 group-hover:text-forest-700 transition line-clamp-1">{rv.title}</h3>
                    <p className="text-xs text-stone-500 mt-1">{rv.destination} · {rv.days} Days</p>
                    {rpPrice && <p className="mt-2 text-sm font-semibold text-forest-700">{formatPrice(rpPrice)}<span className="text-xs font-normal text-stone-400">/person</span></p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Mobile WhatsApp FAB */}
      <a
        href={`https://wa.me/919847012345?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      <Footer />
    </div>
  );
}
