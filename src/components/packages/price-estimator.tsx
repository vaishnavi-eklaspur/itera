"use client";

import { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import { formatPrice, getSeasonForMonth } from "@/lib/utils";

type SeasonalPrice = {
  id: string;
  seasonName: string;
  seasonStartMonth: number;
  seasonEndMonth: number;
  pricePerPerson: number;
};

export function PriceEstimator({ prices }: { prices: SeasonalPrice[] }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [travellers, setTravellers] = useState(2);

  const estimate = useMemo(() => {
    const match = getSeasonForMonth(month, prices);
    const price = match ?? prices[0];
    if (!price) return null;
    return {
      seasonName: price.seasonName,
      perPerson: price.pricePerPerson,
      total: price.pricePerPerson * travellers,
    };
  }, [month, travellers, prices]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (!prices.length) return null;

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-slate-900">Instant Price Estimator</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Travel Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Travellers</label>
          <input
            type="number"
            min={1}
            max={20}
            value={travellers}
            onChange={(e) => setTravellers(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>
      {estimate && (
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-xs text-slate-400">{estimate.seasonName} season</p>
          <p className="text-2xl font-bold text-teal-700">{formatPrice(estimate.total)}</p>
          <p className="text-xs text-slate-400">
            {formatPrice(estimate.perPerson)} x {travellers} traveller{travellers !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </section>
  );
}
