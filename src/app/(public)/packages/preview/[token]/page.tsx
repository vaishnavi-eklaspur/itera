import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { formatPrice } from "@/lib/utils";
import { ItinerarySection } from "@/components/packages/itinerary-section";
import { PriceEstimator } from "@/components/packages/price-estimator";
import { Check, X as XIcon, Calendar, Star, Users, MapPin, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";

export const instant = false;

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const cached = await db.previewCache.findUnique({ where: { token } });
  if (!cached || cached.expiresAt < new Date()) notFound();

  const data = cached.data as {
    title: string;
    destination: string;
    days: number;
    description: string;
    hotelTier: string;
    inclusions: string[];
    exclusions: string[];
    itinerary: { day: number; title: string; location: string; lat: number; lng: number; description: string; activities: string[] }[];
    seasonalPrices: { seasonName: string; seasonStartMonth: number; seasonEndMonth: number; pricePerPerson: number; basis: string; gstInclusive: boolean }[];
  };

  const minPrice = data.seasonalPrices.length
    ? Math.min(...data.seasonalPrices.map((p) => p.pricePerPerson))
    : 0;
  const durationDays = data.itinerary.length || data.days;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Preview banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-amber-800 text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          Preview Mode — This package has not been saved or published.
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-[40vh] min-h-[300px] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex items-center gap-2 text-forest-200 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              {data.destination}
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-white">{data.title}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-forest-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {durationDays} Days / {Math.max(0, durationDays - 1)} Nights
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" /> {data.hotelTier}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <p className="text-stone-600 leading-relaxed">{data.description}</p>
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: "Duration", value: `${durationDays} Days` },
                { icon: Star, label: "Hotels", value: data.hotelTier },
                { icon: Users, label: "Group Size", value: "2-20 pax" },
                { icon: MapPin, label: "Destinations", value: `${new Set(data.itinerary.map((d) => d.location)).size} places` },
              ].map((fact) => (
                <div key={fact.label} className="bg-stone-50 rounded-lg p-4 text-center">
                  <fact.icon className="w-5 h-5 text-forest-600 mx-auto mb-1" />
                  <p className="text-xs text-stone-400">{fact.label}</p>
                  <p className="text-sm font-medium text-stone-700">{fact.value}</p>
                </div>
              ))}
            </section>

            <PriceEstimator prices={data.seasonalPrices.map((p, i) => ({ ...p, id: String(i), isActive: true }))} />

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">Seasonal Pricing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 text-stone-500 font-medium">Season</th>
                      <th className="text-left py-3 text-stone-500 font-medium">Months</th>
                      <th className="text-right py-3 text-stone-500 font-medium">Price/Person</th>
                      <th className="text-right py-3 text-stone-500 font-medium">Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.seasonalPrices.map((price, idx) => {
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const range = price.seasonStartMonth === 1 && price.seasonEndMonth === 12
                        ? "All Year"
                        : `${months[price.seasonStartMonth - 1]} – ${months[price.seasonEndMonth - 1]}`;
                      return (
                        <tr key={idx} className="border-b border-stone-50">
                          <td className="py-3 font-medium text-stone-700">{price.seasonName}</td>
                          <td className="py-3 text-stone-500">{range}</td>
                          <td className="py-3 text-right font-semibold text-forest-700">
                            {formatPrice(price.pricePerPerson)}
                            <span className="block text-[10px] font-normal text-stone-400">Per person</span>
                          </td>
                          <td className="py-3 text-right text-stone-400 text-xs">{price.basis}{price.gstInclusive ? ", GST incl." : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <ItinerarySection itinerary={data.itinerary} />

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-stone-900 mb-3">Inclusions</h2>
                <ul className="space-y-2">
                  {data.inclusions.map((item, i) => (
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
                  {data.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-400">
                      <XIcon className="w-4 h-4 text-stone-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="sticky top-20 space-y-6">
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <div className="text-center mb-4">
                  <span className="text-xs text-stone-400">Starting from</span>
                  <p className="text-2xl font-bold text-forest-700">{formatPrice(minPrice)}</p>
                  <span className="text-xs text-stone-400">Per person</span>
                  <span className="text-xs text-stone-400">per person, twin sharing</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-sm text-amber-700">
                  Preview only — enquiry form disabled
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
