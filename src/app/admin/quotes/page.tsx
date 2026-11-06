"use client";

import { useState, useEffect } from "react";
import { Plus, ExternalLink, ClipboardList } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Quote = {
  id: string;
  token: string;
  travellers: number;
  travelDate: string | null;
  pricePerPerson: number;
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

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [travellers, setTravellers] = useState(2);
  const [travelDate, setTravelDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/quotes").then((r) => r.json()).then(setQuotes);
    fetch("/api/admin/packages").then((r) => r.json()).then(setPackages);
  }, []);

  const selectedPkg = packages.find((p) => p.id === packageId);
  const basePrice = selectedPkg?.seasonalPrices?.[0]?.pricePerPerson ?? 0;
  const totalPrice = basePrice * travellers;

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId, travellers, travelDate: travelDate || undefined,
        pricePerPerson: basePrice, totalPrice,
        inclusions: [], exclusions: [], notes: notes || undefined, validDays: 7,
      }),
    });
    if (res.ok) {
      await res.json();
      setShowForm(false);
      fetch("/api/admin/quotes").then((r) => r.json()).then(setQuotes);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Quotes</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Quote
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Create Quote</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Package</label>
              <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select package...</option>
                {packages.filter((p) => p.currentVersion).map((p) => (
                  <option key={p.id} value={p.id}>{p.currentVersion!.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Travellers</label>
              <input type="number" min={1} value={travellers} onChange={(e) => setTravellers(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Travel Date</label>
              <input type="text" placeholder="e.g. Dec 15-20, 2025" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Price/person</label>
              <p className="px-3 py-2.5 text-sm font-semibold text-teal-700">{formatPrice(basePrice)}</p>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-slate-900">Total: {formatPrice(totalPrice)}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600">Cancel</button>
              <button onClick={handleCreate} disabled={!packageId || saving} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">Create Quote</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        {quotes.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No quotes yet
          </div>
        ) : (
          quotes.map((q) => (
            <div key={q.id} className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div>
                <p className="font-medium text-slate-900 text-sm">{q.package.currentVersion?.title ?? "Unknown"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{q.travellers} pax · {formatPrice(q.totalPrice)} · Valid until {new Date(q.validUntil).toLocaleDateString()}</p>
              </div>
              <a href={`/quote/${q.token}`} target="_blank" className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700">
                <ExternalLink className="w-3.5 h-3.5" /> Share Link
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
