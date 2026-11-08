"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Plus, Trash2, Eye, History, Copy, Upload, ChevronUp, ChevronDown } from "lucide-react";
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

const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  alleppey: { lat: 9.4981, lng: 76.3388 },
  alappuzha: { lat: 9.4981, lng: 76.3388 },
  athirappilly: { lat: 10.2849, lng: 76.5693 },
  cochin: { lat: 9.9312, lng: 76.2673 },
  coorg: { lat: 12.3375, lng: 75.8069 },
  goa: { lat: 15.2993, lng: 74.124 },
  hampi: { lat: 15.335, lng: 76.46 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  kovalam: { lat: 8.4004, lng: 76.9787 },
  kumarakom: { lat: 9.6175, lng: 76.4304 },
  kanyakumari: { lat: 8.0883, lng: 77.5385 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  munnar: { lat: 10.0889, lng: 77.0595 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  rameswaram: { lat: 9.2876, lng: 79.3129 },
  thekkady: { lat: 9.6031, lng: 77.1617 },
  trivandrum: { lat: 8.5241, lng: 76.9366 },
  varkala: { lat: 8.7379, lng: 76.7163 },
  wayanad: { lat: 11.6854, lng: 76.132 },
};

function findLocationCoordinates(location: string) {
  const normalized = location.trim().toLowerCase();
  return Object.entries(LOCATION_COORDINATES).find(([name]) => normalized.includes(name))?.[1];
}

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
  scheduledAt: string | null;
  currentVersion: {
    title: string;
    destination: string;
    days: number;
    description: string;
    hotelTier: string;
    inclusions: string[];
    exclusions: string[];
    itinerary: ItineraryDay[];
    photos: string[];
  } | null;
  seasonalPrices: SeasonalPrice[];
  versions: { id: string; versionNumber: number; title: string; createdAt: string }[];
} | null;

export function PackageEditor({ pkg, readOnly = false }: { pkg: PackageData; readOnly?: boolean }) {
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
  const [photos, setPhotos] = useState<string[]>(v?.photos ?? []);
  const [scheduledAt, setScheduledAt] = useState(pkg?.scheduledAt ? new Date(pkg.scheduledAt).toISOString().slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");

  function getPhotoUrls() {
    return photos.map((photo) => photo.trim()).filter(Boolean);
  }

  function validatePhotoUrls() {
    const invalid = getPhotoUrls().find((photo) => {
      try {
        const url = new URL(photo);
        return !["http:", "https:"].includes(url.protocol);
      } catch {
        return true;
      }
    });
    if (invalid) {
      setError("Each photo must be a direct http(s) image address. Use “Copy image address”, not a webpage URL.");
      return null;
    }
    return getPhotoUrls();
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const photoUrls = validatePhotoUrls();
      if (!photoUrls) return;
      const body = {
        title, destination, days, description, hotelTier,
        inclusions: inclusions.filter(Boolean),
        exclusions: exclusions.filter(Boolean),
        itinerary,
        seasonalPrices: prices,
        photos: photoUrls,
        slug: isNew ? slugify(title) : pkg.slug,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
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

  async function handlePreview() {
    setPreviewing(true);
    setError("");
    try {
      const photoUrls = validatePhotoUrls();
      if (!photoUrls) return;
      const body = {
        title, destination, days, description, hotelTier,
        inclusions: inclusions.filter(Boolean),
        exclusions: exclusions.filter(Boolean),
        itinerary,
        seasonalPrices: prices,
        slug: isNew ? slugify(title) : pkg.slug,
        photos: photoUrls,
      };
      const res = await fetch("/api/admin/packages/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Preview failed");
      }
      const { token } = await res.json();
      window.open(`/packages/preview/${token}`, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
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

  function updateItineraryDay(index: number, field: string, value: string | number | string[]) {
    setItinerary(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  function updateItineraryLocation(index: number, location: string) {
    const coordinates = findLocationCoordinates(location);
    setItinerary(prev => prev.map((day, i) => i === index
      ? { ...day, location, ...(coordinates ?? {}) }
      : day
    ));
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
        <h1 className="text-2xl font-semibold text-stone-900">
          {isNew ? "New Package" : `Edit: ${v?.title}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && !readOnly && (
            <>
              <button onClick={handleDuplicate} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50">
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
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-forest-700 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? "Create" : "Save (New Version)"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <fieldset disabled={readOnly} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="font-semibold text-stone-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-stone-600 mb-1 block">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Destination</label>
                  <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
                </div>
                <div>
                  <label className="text-sm text-stone-600 mb-1 block">Hotel Tier</label>
                  <select value={hotelTier} onChange={(e) => setHotelTier(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500">
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
                <label className="text-sm text-stone-600 mb-1 block">Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none" />
              </div>
            </div>
          </section>

          {/* Itinerary */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-900">Itinerary ({itinerary.length} days)</h2>
              <button onClick={addDay} className="flex items-center gap-1 text-sm text-forest-600 hover:text-forest-700">
                <Plus className="w-4 h-4" /> Add Day
              </button>
            </div>
            <div className="space-y-4">
              {itinerary.map((day, i) => (
                <div key={i} className="border border-stone-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-forest-700">Day {day.day}</span>
                    {itinerary.length > 1 && (
                      <button onClick={() => removeDay(i)} className="text-stone-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input placeholder="Title" value={day.title} onChange={(e) => updateItineraryDay(i, "title", e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
                    <input
                      placeholder="Location (e.g. Munnar)"
                      value={day.location}
                      onChange={(e) => updateItineraryLocation(i, e.target.value)}
                      className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                    />
                  </div>
                  <textarea placeholder="Description" rows={2} value={day.description} onChange={(e) => updateItineraryDay(i, "description", e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none mb-3" />
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-stone-500">Advanced map settings</summary>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <label className="text-xs text-stone-500">
                        Latitude
                        <input type="number" step="0.0001" value={day.lat} onChange={(e) => updateItineraryDay(i, "lat", parseFloat(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
                      </label>
                      <label className="text-xs text-stone-500">
                        Longitude
                        <input type="number" step="0.0001" value={day.lng} onChange={(e) => updateItineraryDay(i, "lng", parseFloat(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
                      </label>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      Coordinates update automatically for common Kerala and South India locations.
                    </p>
                  </details>
                  <div className="mt-3">
                    <label className="text-xs text-stone-400 mb-1 block">Activities (comma-separated)</label>
                    <input
                      value={day.activities.join(", ")}
                      onChange={(e) => updateItineraryDay(i, "activities", e.target.value.split(",").map(a => a.trim()).filter(Boolean))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                      placeholder="Houseboat cruise, Temple visit, Tea tasting"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Inclusions / Exclusions */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ListEditor label="Inclusions" items={inclusions} onChange={setInclusions} />
              <ListEditor label="Exclusions" items={exclusions} onChange={setExclusions} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seasonal Pricing */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-900">Pricing</h2>
              <button
                onClick={() => setPrices(prev => [...prev, { seasonName: "", seasonStartMonth: 1, seasonEndMonth: 12, pricePerPerson: 0, basis: "Per person, twin sharing", gstInclusive: true }])}
                className="text-sm text-forest-600 hover:text-forest-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {prices.map((price, i) => (
                <div key={i} className="border border-stone-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input placeholder="Season name" value={price.seasonName} onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], seasonName: e.target.value };
                      setPrices(next);
                    }} className="text-sm font-medium border-0 focus:outline-none p-0 flex-1" />
                    {prices.length > 1 && (
                      <button onClick={() => setPrices(prev => prev.filter((_, j) => j !== i))} className="text-stone-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={price.seasonStartMonth} onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], seasonStartMonth: Number(e.target.value) };
                      setPrices(next);
                    }} className="px-2 py-1.5 border border-stone-200 rounded text-xs">
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, mi) => (
                        <option key={mi} value={mi + 1}>{m}</option>
                      ))}
                    </select>
                    <select value={price.seasonEndMonth} onChange={(e) => {
                      const next = [...prices];
                      next[i] = { ...next[i], seasonEndMonth: Number(e.target.value) };
                      setPrices(next);
                    }} className="px-2 py-1.5 border border-stone-200 rounded text-xs">
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
                    className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Version History */}
          {pkg && pkg.versions.length > 0 && (
            <section className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4" /> Version History
              </h2>
              <div className="space-y-2">
                {pkg.versions.map((ver) => (
                  <div key={ver.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-stone-700">v{ver.versionNumber}</span>
                      <p className="text-xs text-stone-400">{new Date(ver.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(ver.id)}
                      className="text-xs text-forest-600 hover:text-forest-700"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Photos */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-900">Photos</h2>
              <button onClick={() => setPhotos(prev => [...prev, ""])} className="text-sm text-forest-600 hover:text-forest-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {photos.length === 0 ? (
              <p className="text-sm text-stone-400">No photos added. Click + to add image URLs.</p>
            ) : (
              <div className="space-y-3">
                {photos.map((url, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    {url.trim() && /^https?:\/\/.+/i.test(url.trim()) && (
                      <img
                        src={url.trim()}
                        alt=""
                        className="w-16 h-12 object-cover rounded border border-stone-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const preview = e.currentTarget.nextElementSibling;
                          preview?.classList.remove("hidden");
                        }}
                      />
                    )}
                    <span className="hidden w-16 shrink-0 pt-1 text-[10px] leading-3 text-red-500">Image address could not be loaded</span>
                    <input
                      type="url"
                      placeholder="Direct image address (https://...)"
                      value={url}
                      onChange={(e) => {
                        const next = [...photos];
                        next[i] = e.target.value;
                        setPhotos(next);
                      }}
                      className="flex-1 px-2 py-1.5 border border-stone-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                    />
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button disabled={i === 0} onClick={() => { const next = [...photos]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setPhotos(next); }} className="text-stone-400 hover:text-stone-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button disabled={i === photos.length - 1} onClick={() => { const next = [...photos]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; setPhotos(next); }} className="text-stone-400 hover:text-stone-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="text-stone-400 hover:text-red-500 shrink-0 mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {photos.filter(Boolean).length > 0 && (
                  <p className="text-xs text-stone-400">
                    Paste a direct image address using “Copy image address”. The first photo is used as the hero image.
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 rounded-lg border border-forest-100 bg-forest-50 p-3 text-xs text-forest-800">
              <p className="font-semibold">How to add a package photo</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                <li>Open the image in a new browser tab.</li>
                <li>Right-click the image and choose <strong>Copy image address</strong>.</li>
                <li>Paste the address here and confirm the preview appears.</li>
                <li>Click <strong>Save (New Version)</strong>, then preview or publish the package.</li>
              </ol>
              <p className="mt-2 text-forest-700">
                Do not paste the webpage address. It must start with <code>https://</code> and point directly to an image.
              </p>
            </div>
          </section>

          {/* Scheduling */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="font-semibold text-stone-900 mb-4">Publish Schedule</h2>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
            {scheduledAt && <p className="text-xs text-stone-400 mt-2">Will auto-publish at {new Date(scheduledAt).toLocaleString()}</p>}
            {scheduledAt && <button onClick={() => setScheduledAt("")} className="text-xs text-red-500 mt-1">Clear schedule</button>}
          </section>

          {/* Status */}
          {pkg && (
            <section className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="font-semibold text-stone-900 mb-2">Status</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                pkg.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                pkg.status === "DRAFT" ? "bg-amber-100 text-amber-700" :
                "bg-stone-100 text-stone-500"
              }`}>
                {pkg.status}
              </span>
              <p className="text-xs text-stone-400 mt-2">Slug: /{pkg.slug}</p>
            </section>
          )}
        </div>
      </fieldset>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-stone-700">{label}</h3>
        <button onClick={() => onChange([...items, ""])} className="text-forest-600 hover:text-forest-700">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
              className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            {items.length > 1 && (
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-stone-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
