"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const gridPhotos = photos.slice(0, 6);
  const remaining = photos.length - 6;

  return (
    <>
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Photos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl overflow-hidden">
          {gridPhotos.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className={`relative aspect-[4/3] overflow-hidden group ${i === 0 ? "col-span-2 row-span-2 aspect-auto" : ""}`}
            >
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
              {i === 5 && remaining > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">+{remaining} more</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
            <X className="w-8 h-8" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length); }}
                className="absolute left-4 text-white/80 hover:text-white z-10"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length); }}
                className="absolute right-4 text-white/80 hover:text-white z-10"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          <img
            src={photos[lightboxIndex]}
            alt={`Photo ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded"
          />

          <div className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
