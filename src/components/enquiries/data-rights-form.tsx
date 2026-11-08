"use client";

import { FormEvent, useState } from "react";

export function DataRightsForm({
  enquiryId,
  current,
}: {
  enquiryId: string;
  current: { name: string; email: string; phone: string | null; travelDates: string | null; budget: string | null; adults: number | null; children: number | null };
}) {
  const [type, setType] = useState<"CORRECTION" | "DELETION">("CORRECTION");
  const [details, setDetails] = useState("");
  const [name, setName] = useState(current.name);
  const [email, setEmail] = useState(current.email);
  const [phone, setPhone] = useState(current.phone ?? "");
  const [travelDates, setTravelDates] = useState(current.travelDates ?? "");
  const [budget, setBudget] = useState(current.budget ?? "");
  const [adults, setAdults] = useState(current.adults?.toString() ?? "");
  const [children, setChildren] = useState(current.children?.toString() ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/me/data-rights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        details,
        enquiryId,
        correctionData: type === "CORRECTION" ? {
          name, email, phone: phone || null, travelDates: travelDates || null, budget: budget || null,
          adults: adults ? Number(adults) : null, children: children ? Number(children) : null,
        } : undefined,
      }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Request submitted for staff review." : result.error ?? "Unable to submit request.");
    setBusy(false);
    if (response.ok) setDetails("");
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-stone-100 pt-4 space-y-3">
      <label className="block text-xs font-medium text-stone-600">
        Data request
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
          <option value="CORRECTION">Correct my information</option>
          <option value="DELETION">Delete my information</option>
        </select>
      </label>
      {type === "CORRECTION" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Name" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="Email" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input value={travelDates} onChange={(event) => setTravelDates(event.target.value)} placeholder="Travel dates" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input value={adults} onChange={(event) => setAdults(event.target.value)} type="number" min={0} placeholder="Adults" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input value={children} onChange={(event) => setChildren(event.target.value)} type="number" min={0} placeholder="Children" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Budget" className="rounded-lg border border-stone-200 px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Explain what needs correcting" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" rows={3} />
        </>
      )}
      <button disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">
        {busy ? "Submitting..." : "Submit request"}
      </button>
      {message && <p className="text-xs text-stone-500">{message}</p>}
    </form>
  );
}
