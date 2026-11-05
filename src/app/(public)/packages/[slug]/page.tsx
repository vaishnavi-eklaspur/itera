import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { EnquiryForm } from "@/components/packages/enquiry-form";
import { PriceEstimator } from "@/components/packages/price-estimator";
import { ItinerarySection } from "@/components/packages/itinerary-section";
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
  return {
    title: v.title,
    description: v.description.slice(0, 160),
    openGraph: {
      title: v.title,
      description: v.description.slice(0, 160),
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

  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in the "${v.title}" package (${v.days} days). Could you share more details?`
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative h-[40vh] min-h-[300px] bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex items-center gap-2 text-teal-200 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              {v.destination}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{v.title}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-teal-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {v.days} Days / {v.days - 1} Nights
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" /> {v.hotelTier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile price bar */}
      <div className="lg:hidden sticky top-16 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400">From</span>
          <p className="text-lg font-semibold text-teal-700">{formatPrice(minPrice)}<span className="text-xs font-normal text-slate-400">/person</span></p>
        </div>
        <a href="#enquiry-form" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
          Enquire Now
        </a>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section>
              <p className="text-slate-600 leading-relaxed">{v.description}</p>
            </section>

            {/* Quick facts */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: "Duration", value: `${v.days} Days` },
                { icon: Star, label: "Hotels", value: v.hotelTier },
                { icon: Users, label: "Group Size", value: "2-20 pax" },
                { icon: MapPin, label: "Destinations", value: `${new Set(itinerary.map(d => d.location)).size} places` },
              ].map((fact) => (
                <div key={fact.label} className="bg-slate-50 rounded-lg p-4 text-center">
                  <fact.icon className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">{fact.label}</p>
                  <p className="text-sm font-medium text-slate-700">{fact.value}</p>
                </div>
              ))}
            </section>

            {/* Price Estimator */}
            <PriceEstimator
              prices={JSON.parse(JSON.stringify(pkg.seasonalPrices))}
            />

            {/* Seasonal Pricing Table */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Seasonal Pricing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 text-slate-500 font-medium">Season</th>
                      <th className="text-left py-3 text-slate-500 font-medium">Months</th>
                      <th className="text-right py-3 text-slate-500 font-medium">Price/Person</th>
                      <th className="text-right py-3 text-slate-500 font-medium">Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.seasonalPrices.map((price) => {
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const range = price.seasonStartMonth === 1 && price.seasonEndMonth === 12
                        ? "All Year"
                        : `${months[price.seasonStartMonth - 1]} – ${months[price.seasonEndMonth - 1]}`;

                      return (
                        <tr key={price.id} className="border-b border-slate-50">
                          <td className="py-3 font-medium text-slate-700">{price.seasonName}</td>
                          <td className="py-3 text-slate-500">{range}</td>
                          <td className="py-3 text-right font-semibold text-teal-700">{formatPrice(price.pricePerPerson)}</td>
                          <td className="py-3 text-right text-slate-400 text-xs">{price.basis}{price.gstInclusive ? ", GST incl." : ""}</td>
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
                <h2 className="text-xl font-semibold text-slate-900 mb-3">Inclusions</h2>
                <ul className="space-y-2">
                  {v.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-3">Exclusions</h2>
                <ul className="space-y-2">
                  {v.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <XIcon className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
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
              <div className="hidden lg:block bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-center mb-4">
                  <span className="text-xs text-slate-400">Starting from</span>
                  <p className="text-2xl font-bold text-teal-700">{formatPrice(minPrice)}</p>
                  <span className="text-xs text-slate-400">per person, twin sharing</span>
                </div>
                <a
                  href="#enquiry-form"
                  className="block w-full bg-teal-600 text-white text-center py-3 rounded-lg font-medium hover:bg-teal-700 transition text-sm"
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
