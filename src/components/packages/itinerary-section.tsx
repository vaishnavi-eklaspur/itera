"use client";

import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";

const ItineraryMap = dynamic(() => import("./itinerary-map").then((m) => m.ItineraryMap), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-stone-100 rounded-lg skeleton" />,
});

type Day = {
  day: number;
  title: string;
  location: string;
  lat: number;
  lng: number;
  description: string;
  activities: string[];
};

export function ItinerarySection({ itinerary }: { itinerary: Day[] }) {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <section>
      <h2 className="text-xl font-semibold text-stone-900 mb-4">Day-wise Itinerary</h2>

      {/* Map */}
      <div className="mb-6 rounded-xl overflow-hidden border border-stone-200">
        <ItineraryMap days={itinerary} activeDay={expanded} onDayClick={setExpanded} />
      </div>

      {/* Accordion */}
      <div className="space-y-2">
        {itinerary.map((day, i) => (
          <div key={day.day} className="border border-stone-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition"
            >
              <span className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 text-xs font-semibold flex items-center justify-center shrink-0">
                {day.day}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{day.title}</p>
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {day.location}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-stone-400 transition-transform ${expanded === i ? "rotate-180" : ""}`}
              />
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 pt-1 border-t border-stone-100">
                <p className="text-sm text-stone-600 mb-3">{day.description}</p>
                {day.activities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {day.activities.map((a, j) => (
                      <span key={j} className="text-xs bg-forest-50 text-forest-700 px-2.5 py-1 rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
