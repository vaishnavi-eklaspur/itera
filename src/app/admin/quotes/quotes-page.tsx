"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, ClipboardList } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { calculateGst } from "@/lib/gst";

type Quote = {
  id: string;
  token: string;
  travellers: number;
  travelDate: string | null;
  pricePerPerson: number;
  basis: string;
  gstInclusive: boolean;
  gstRate: number;
  totalPrice: number;
  validUntil: string;
  createdAt: string;
  package: { currentVersion: { title: string; destination: string } | null };
  author: { name: string };
};

type Package = {
  id: string;
  currentVersion: { title: string; destination: string; days: number } | null;
  seasonalPrices: { pricePerPerson: number; seasonName: string }[];
};

type EnquiryPreset = {
  package?: { id: string } | null;
  message?: string;
  aiExtracted?: {
    adults?: number | null;
    children?: number | null;
    dates?: { raw?: string | null } | null;
  } | null;
};

export default function QuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const enquiryId = searchParams.get("enquiryId") || undefined;
  const hasPackagePreset = Boolean(searchParams.get("packageId"));
  const hasTravellerPreset = Boolean(searchParams.get("travellers"));
  const hasDatePreset = Boolean(searchParams.get("travelDate"));
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packageId, setPackageId] = useState(() => searchParams.get("packageId") || "");
  const [showForm, setShowForm] = useState(() => Boolean(searchParams.get("packageId") || searchParams.get("enquiryId")));
  const [travellers, setTravellers] = useState(() => Number(searchParams.get("travellers")) || 2);
  const [travelDate, setTravelDate] = useState(() => searchParams.get("travelDate") || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadQuoteContext() {
      try {
        const [quotesRes, packagesRes] = await Promise.all([
          fetch("/api/admin/quotes"),
          fetch("/api/admin/packages"),
        ]);
        if (!quotesRes.ok || !packagesRes.ok) throw new Error("Could not load quote builder data");
        const [quoteData, packageData] = await Promise.all([quotesRes.json(), packagesRes.json()]);
        setQuotes(quoteData);
        setPackages(packageData);

        if (!enquiryId) return;
        const enquiryRes = await fetch(`/api/admin/enquiries/${enquiryId}`);
        if (!enquiryRes.ok) throw new Error("Could not load the selected enquiry");
        const enquiry = (await enquiryRes.json()) as EnquiryPreset;
        const extraction = enquiry.aiExtracted;
        const extractedTravellers = (extraction?.adults ?? 0) + (extraction?.children ?? 0);

        if (!hasPackagePreset && enquiry.package?.id) setPackageId(enquiry.package.id);
        if (!hasTravellerPreset && extractedTravellers > 0) setTravellers(extractedTravellers);
        if (!hasDatePreset && extraction?.dates?.raw) setTravelDate(extraction.dates.raw);
        if (enquiry.message) setNotes((current) => current || `Based on enquiry: ${enquiry.message}`);
        setShowForm(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load quote builder data");
      }
    }

    loadQuoteContext();
  }, [enquiryId, hasDatePreset, hasPackagePreset, hasTravellerPreset]);

  const selectedPkg = packages.find((p) => p.id === packageId);
  const basePrice = selectedPkg?.seasonalPrices?.[0]?.pricePerPerson ?? 0;
  const [gstInclusive, setGstInclusive] = useState(true);
  const [gstRate, setGstRate] = useState(18);
  const gst = calculateGst(basePrice, travellers, gstRate, gstInclusive);

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId, enquiryId, travellers, travelDate: travelDate || undefined,
        pricePerPerson: basePrice, gstRate, gstInclusive,
        basis: "Per person, twin sharing",
        inclusions: [], exclusions: [], notes: notes || undefined, validDays: 7,
      }),
    });
    if (res.ok) {
      const created = await res.json() as { token: string };
      if (enquiryId) {
        router.push(`/admin/enquiries/${enquiryId}?quoteToken=${encodeURIComponent(created.token)}`);
      } else {
        setShowForm(false);
        fetch("/api/admin/quotes").then((r) => r.json()).then(setQuotes);
      }
    } else {
      const error = await res.json().catch(() => null) as { error?: string } | null;
      setLoadError(error?.error ?? "Could not create quote");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-stone-900">Quotes</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-forest-700 text-white rounded-lg hover:bg-forest-700">
          <Plus className="w-4 h-4" /> New Quote
        </button>
      </div>

      {loadError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

      {showForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-stone-900">Create Quote</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Package</label>
              <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm">
                <option value="">Select package...</option>
                {packages.filter((p) => p.currentVersion).map((p) => (
                  <option key={p.id} value={p.id}>{p.currentVersion!.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Travellers</label>
              <input type="number" min={1} value={travellers} onChange={(e) => setTravellers(Number(e.target.value))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Travel Date</label>
              <input type="text" placeholder="e.g. Dec 15-20, 2025" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Price/person</label>
              <p className="px-3 py-2.5 text-sm font-semibold text-forest-700">{formatPrice(basePrice)}</p>
              <p className="text-xs text-stone-400">Per person, twin sharing</p>
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">GST rate (%)</label>
              <input type="number" min={0} max={100} step={0.01} value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-600 sm:pt-8">
              <input type="checkbox" checked={gstInclusive} onChange={(e) => setGstInclusive(e.target.checked)} className="rounded border-stone-300 text-forest-600" />
              GST inclusive
            </label>
            <div className="sm:col-span-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(gst.subtotal)}</span></div>
              <div className="flex justify-between"><span>GST ({gstRate}%)</span><span>{formatPrice(gst.gstAmount)}</span></div>
            </div>
          </div>
          <div>
            <label className="text-sm text-stone-600 mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-stone-900">Total: {formatPrice(gst.total)}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm border border-stone-200 rounded-lg text-stone-600">Cancel</button>
              <button onClick={handleCreate} disabled={!packageId || saving} className="px-4 py-2 text-sm bg-forest-700 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50">Create Quote</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200">
        {quotes.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-stone-300" />
            No quotes yet
          </div>
        ) : (
          quotes.map((q) => (
            <div key={q.id} className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
              <div>
                <p className="font-medium text-stone-900 text-sm">{q.package.currentVersion?.title ?? "Unknown"}</p>
                <p className="text-xs text-stone-400 mt-0.5">{q.travellers} pax · {formatPrice(q.totalPrice)} · {q.basis} · GST {q.gstRate}% {q.gstInclusive ? "inclusive" : "extra"} · Valid until {new Date(q.validUntil).toLocaleDateString()}</p>
              </div>
              <a href={`/quote/${q.token}`} target="_blank" className="flex items-center gap-1 text-xs text-forest-600 hover:text-forest-700">
                <ExternalLink className="w-3.5 h-3.5" /> Share Link
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
