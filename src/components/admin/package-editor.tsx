"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Plus, Trash2, GripVertical, Eye, History, Copy, Upload } from "lucide-react";
import { slugify } from "@/lib/utils";

type ItineraryDay = {
  day: number;
  title: string;
  location: string;
  lat: number;
  lng: number;
  description: string;
  activities: string[];
};

type SeasonalPrice = {
  id?: string;
  seasonName: string;
  seasonStartMonth: number;
  seasonEndMonth: number;
  pricePerPerson: number;
  basis: string;
  gstInclusive: boolean;
};

type PackageData = {
  id: string;
  slug: string;
  status: string;
  currentVersion: {
    title: string;
    destination: string;
    days: number;
    description: string;
    hotelTier: string;
    inclusions: string[];
    exclusions: string[];
    itinerary: ItineraryDay[];
  } | null;
  seasonalPrices: SeasonalPrice[];
  versions: { id: string; versionNumber: number; title: string; createdAt: string }[];
} | null;

export function PackageEditor({ pkg }: { pkg: PackageData }) {
  const router = useRouter();
  const isNew = !pkg;
  const v = pkg?.currentVersion;

  const [title, setTitle] = useState(v?.title ?? "");
  const [destination, setDestination] = useState(v?.destination ?? "");
  const [days, setDays] = useState(v?.days ?? 5);
  const [description, setDescription] = useState(v?.description ?? "");
  const [hotelTier, setHotelTier] = useState(v?.hotelTier ?? "3-Star");
  const [inclusions, setInclusions] = useState<string[]>(v?.inclusions ?? [""]);
  const [exclusions, setExclusions] = useState<string[]>(v?.exclusions ?? [""]);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    v?.itinerary ?? [{ day: 1, title: "", location: "", lat: 10.0, lng: 76.0, description: "", activities: [] }]
  );
  const [prices, setPrices] = useState<SeasonalPrice[]>(
    pkg?.seasonalPrices ?? [{ seasonName: "Regular", seasonStartMonth: 1, seasonEndMonth: 12, pricePerPerson: 0, basis: "Per person, twin sharing", gstInclusive: true }]
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = {
        title, destination, days, description, hotelTier,
        inclusions: inclusions.filter(Boolean),
        exclusions: exclusions.filter(Boolean),
        itinerary,
        seasonalPrices: prices,
        slug: isNew ? slugify(title) : undefined,
      };

      const url = isNew ? "/api/admin/packages" : `/api/admin/packages/${pkg.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      const data = await res.json();
      if (isNew) {
        router.push(`/admin/packages/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!pkg) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDuplicate() {
    if (!pkg) return;
    const res = await fetch(`/api/admin/packages/${pkg.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/packages/${data.id}`);
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (!pkg) return;
    const res = await fetch(`/api/admin/packages/${pkg.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (res.ok) router.refresh();
  }

  function updateItineraryDay(index: number, field: string, value: any) {
    setItinerary(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  function addDay() {
    setItinerary(prev => [...prev, {
      day: prev.length + 1, title: "", location: "", lat: 10.0, lng: 76.0, description: "", activities: [],
    }]);
    setDays(prev => prev + 1);
  }

  function removeDay(index: number) {
    setItinerary(prev => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 })));
    setDays(prev => Math.max(1, prev - 1));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {isNew ? "New Package" : `Edit: ${v?.title}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <button onClick={handleDuplicate} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              {pkg.status !== "PUBLISHED" && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Publish
                </button>
              )}
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? "Create" : "Save (New Version)"}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Destination</label>
                  <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Hotel Tier</label>
                  <select value={hotelTier} onChange={(e) => setHotelTier(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option>Budget</option>
                    <option>3-Star</option>
                    <option>4-Star</option>
                    <option>5-Star</option>
                    <option>Premium</option>
                    <option>Heritage</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
            </div>
          </section>

          {/* Itinerary */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Itinerary ({itinerary.length} days)</h2>
              <button onClick={addDay} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
                <Plus className="w-4 h-4" /> Add Day
              </button>
            </div>
            <div className="space-y-4">
              {itinerary.map((day, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-teal-700">Day {day.day}</span>
                    {itinerary.length > 1 && (
                      <button onClick={() => removeDay(i)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input placeholder="Title" value={day.title} onChange={(e) => updateItineraryDay(i, "title", e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <input placeholder="Location" value={day.location} onChange={(e) => updateItineraryDay(i, "location", e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <textarea placeholder="Description" rows={2} value={day.description} onChange={(e) => updateItineraryDay(i, "description", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="0.0001" placeholder="Latitude" value={day.lat} onChange={(e) => updateItineraryDay(i, "lat", parseFloat(e.target.value) || 0)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <input type="number" step="0.0001" placeholder="Longitude" value={day.lng} onChange={(e) => updateItineraryDay(i, "lng", parseFloat(e.target.value) || 0)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-slate-400 mb-1 block">Activities (comma-separated)</label>
                    <input
                      value={day.activities.join(", ")}
                      onChange={(e) => updateItineraryDay(i, "activities", e.target.value.split(",").map(a => a.trim()).filter(Boolean))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Houseboat cruise, Temple visit, Tea tasting"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Inclusions / Exclusions */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ListEditor label="Inclusions" items={inclusions} onChange={setInclusions} />
              <ListEditor label="Exclusions" items={exclusions} onChange={setExclusions} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seasonal Pricing */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Pricing</h2>
              <button
                onClick={() => setPrices(prev => [...prev, { seasonName: "", seasonStartMonth: 1, seasonEndMonth: 12, pricePerPerson: 0, basis: "Per person, twin sharing", gstInclusive: true }])}
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {prices.map((price, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input placeholder="Season name" value={price.seasonName} onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], seasonName: e.target.value };
                      setPrices(next);
                    }} className="text-sm font-medium border-0 focus:outline-none p-0 flex-1" />
                    {prices.length > 1 && (
                      <button onClick={() => setPrices(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={price.seasonStartMonth} onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], seasonStartMonth: Number(e.target.value) };
                      setPrices(next);
                    }} className="px-2 py-1.5 border border-slate-200 rounded text-xs">
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, mi) => (
                        <option key={mi} value={mi + 1}>{m}</option>
                      ))}
                    </select>
                    <select value={price.seasonEndMonth} onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], seasonEndMonth: Number(e.target.value) };
                      setPrices(next);
                    }} className="px-2 py-1.5 border border-slate-200 rounded text-xs">
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, mi) => (
                        <option key={mi} value={mi + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    placeholder="Price per person"
                    value={price.pricePerPerson || ""}
                    onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], pricePerPerson: Number(e.target.value) };
                      setPrices(next);
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Version History */}
          {pkg && pkg.versions.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4" /> Version History
              </h2>
              <div className="space-y-2">
                {pkg.versions.map((ver) => (
                  <div key={ver.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-slate-700">v{ver.versionNumber}</span>
                      <p className="text-xs text-slate-400">{new Date(ver.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(ver.id)}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Status */}
          {pkg && (
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-2">Status</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                pkg.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                pkg.status === "DRAFT" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-500"
              }`}>
                {pkg.status}
              </span>
              <p className="text-xs text-slate-400 mt-2">Slug: /{pkg.slug}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-700">{label}</h3>
        <button onClick={() => onChange([...items, ""])} className="text-teal-600 hover:text-teal-700">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {items.length > 1 && (
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
