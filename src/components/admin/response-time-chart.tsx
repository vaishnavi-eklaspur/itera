"use client";

import { useEffect, useMemo, useState } from "react";

type ResponseDay = { date: string; averageMinutes: number | null; sampleSize: number };

export function ResponseTimeChart({ initialData }: { initialData: ResponseDay[] }) {
  const [data, setData] = useState(initialData);
  const chartHeight = 180;
  const maxMinutes = useMemo(
    () => Math.max(60, ...data.map((item) => item.averageMinutes ?? 0)),
    [data]
  );
  const slaPosition = chartHeight - (60 / maxMinutes) * chartHeight;

  useEffect(() => {
    let active = true;

    async function refresh() {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { responseTrend?: ResponseDay[] };
      if (active && body.responseTrend) setData(body.responseTrend);
    }

    const interval = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return data.length === 0 ? (
    <p className="text-sm text-stone-400">No response data yet</p>
  ) : (
    <div>
      <div className="relative h-52 border-b border-l border-stone-200">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-red-400"
          style={{ top: `${slaPosition}px` }}
        >
          <span className="absolute right-0 -top-5 text-xs text-red-500">60 min SLA</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-2 px-2">
          {data.map((item) => {
            const height = item.averageMinutes == null
              ? 4
              : Math.max((item.averageMinutes / maxMinutes) * chartHeight, 6);
            return (
              <div key={item.date} className="group relative flex h-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-12 rounded-t ${item.averageMinutes != null && item.averageMinutes > 60 ? "bg-red-400" : "bg-forest-500"}`}
                  style={{ height: `${height}px` }}
                />
                <div className="absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white group-hover:block">
                  {item.averageMinutes == null
                    ? `${item.date}: No valid replies`
                    : `${item.date}: ${item.averageMinutes}m average (${item.sampleSize} ${item.sampleSize === 1 ? "reply" : "replies"})`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2 px-2">
        {data.map((item) => (
          <span key={item.date} className="flex-1 text-center text-[10px] text-stone-400">
            {item.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
