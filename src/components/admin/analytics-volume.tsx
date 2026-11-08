"use client";

import { useEffect, useMemo, useState } from "react";

type DailyEnquiry = { date: string; count: number };

export function AnalyticsVolume({ initialData }: { initialData: DailyEnquiry[] }) {
  const [data, setData] = useState(initialData);
  const chartHeight = 160;

  useEffect(() => {
    let active = true;

    async function refresh() {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { dailyEnquiries?: Record<string, number> };
      if (!active || !body.dailyEnquiries) return;
      setData(Object.entries(body.dailyEnquiries).map(([date, count]) => ({ date, count })));
    }

    const interval = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const max = useMemo(() => Math.max(...data.map((item) => item.count), 1), [data]);

  return data.length === 0 ? (
    <p className="text-sm text-stone-400">No data yet</p>
  ) : (
    <div className="flex items-end gap-1 h-40">
      {data.map((item) => {
        const height = Math.max((item.count / max) * chartHeight, item.count > 0 ? 8 : 4);
        return (
          <div key={item.date} className="flex-1 flex flex-col items-center group relative">
            <div
              className="w-full bg-forest-500 rounded-t hover:bg-forest-600 transition min-h-[4px]"
              style={{ height: `${height}px` }}
            />
            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-stone-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {item.date}: {item.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
