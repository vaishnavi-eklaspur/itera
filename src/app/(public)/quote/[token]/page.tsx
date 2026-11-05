import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Calendar, Users, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Metadata } from "next";

export const instant = false;

async function getQuote(token: string) {
  return db.quote.findUnique({
    where: { token },
    include: {
      package: { include: { currentVersion: { select: { title: true, destination: true, days: true } } } },
      author: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const quote = await getQuote(token);
  if (!quote) return { title: "Quote Not Found" };
  return { title: `Quote — ${quote.package.currentVersion?.title ?? "Package"}`, description: `Travel quote for ${quote.travellers} travellers` };
}

export default async function QuoteViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getQuote(token);
  if (!quote) notFound();

  const v = quote.package.currentVersion;
  const expired = new Date(quote.validUntil) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden print:shadow-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-tight">Itera</span>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">Travel Quote</span>
          </div>
          <h1 className="text-xl font-semibold mt-4">{v?.title ?? "Package"}</h1>
          {v && (
            <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {v.destination}</span>
              <span>{v.days} Days</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="px-8 py-6 space-y-6">
          {expired && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4" /> This quote has expired
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Travellers</p>
              <p className="text-lg font-semibold text-slate-900 flex items-center gap-1.5"><Users className="w-4 h-4 text-teal-500" /> {quote.travellers}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Travel Date</p>
              <p className="text-lg font-semibold text-slate-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-teal-500" /> {quote.travelDate || "Flexible"}</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 text-sm text-slate-500">
              <span>Per person</span>
              <span className="font-semibold text-slate-900">{formatPrice(quote.pricePerPerson)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 text-sm text-slate-500">
              <span>Travellers</span>
              <span className="text-slate-900">&times; {quote.travellers}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 bg-teal-50 border-t border-slate-200">
              <span className="font-semibold text-teal-800">Total</span>
              <span className="text-2xl font-bold text-teal-700">{formatPrice(quote.totalPrice)}</span>
            </div>
          </div>

          {/* Inclusions / Exclusions */}
          {quote.inclusions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Inclusions</h3>
              <ul className="space-y-1">
                {quote.inclusions.map((item, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {item}</li>
                ))}
              </ul>
            </div>
          )}
          {quote.exclusions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Exclusions</h3>
              <ul className="space-y-1">
                {quote.exclusions.map((item, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2"><XCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" /> {item}</li>
                ))}
              </ul>
            </div>
          )}

          {quote.notes && (
            <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-lg">{quote.notes}</div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>Prepared by {quote.author.name}</span>
            <span>Valid until {new Date(quote.validUntil).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
