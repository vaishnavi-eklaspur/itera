"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { timeAgo, responseTimeBadge } from "@/lib/utils";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  channel: string;
  createdAt: string;
  package: { currentVersion: { title: string } | null } | null;
  assignedTo: { id: string; name: string; role: string } | null;
  replies: { sentAt: string }[];
};

export function EnquiryList({ enquiries, currentStatus }: { enquiries: Enquiry[]; currentStatus?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const toggleAll = () => {
    if (selected.size === enquiries.length) setSelected(new Set());
    else setSelected(new Set(enquiries.map((e) => e.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const applyBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    setLoading(true);
    await fetch("/api/admin/enquiries/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], status: bulkAction }),
    });
    setSelected(new Set());
    setBulkAction("");
    setLoading(false);
    router.refresh();
  };

  const statuses = ["ALL", "NEW", "IN_PROGRESS", "REPLIED", "CLOSED"];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-3 py-2 text-sm font-medium text-white hover:bg-forest-800"
        >
          <Plus className="h-4 w-4" /> Add enquiry
        </button>
      </div>
      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/enquiries" : `/admin/enquiries?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              (s === "ALL" && !currentStatus) || s === currentStatus
                ? "bg-forest-100 text-forest-700"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-forest-50 border border-forest-200 rounded-lg">
          <span className="text-sm font-medium text-forest-800">{selected.size} selected</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="text-sm border border-forest-200 rounded px-2 py-1 bg-white"
          >
            <option value="">Change status to...</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REPLIED">Replied</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button
            onClick={applyBulk}
            disabled={!bulkAction || loading}
            className="px-3 py-1 bg-forest-700 text-white text-sm rounded hover:bg-forest-800 disabled:opacity-50 transition"
          >
            {loading ? "Updating..." : "Apply"}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-stone-500 hover:text-stone-700 ml-auto">
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* Header row with select all */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-stone-100 bg-stone-50">
          <input
            type="checkbox"
            checked={enquiries.length > 0 && selected.size === enquiries.length}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
          />
          <span className="text-xs text-stone-500 font-medium">Select all</span>
        </div>

        <div className="divide-y divide-stone-50">
          {enquiries.map((e) => {
            const firstReplyAt = e.replies[0]?.sentAt ?? null;
            const badge = responseTimeBadge(new Date(e.createdAt), firstReplyAt ? new Date(firstReplyAt) : null);
            return (
              <div key={e.id} className="flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition">
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => toggle(e.id)}
                  className="w-4 h-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500 shrink-0"
                />
                <Link href={`/admin/enquiries/${e.id}`} className="flex items-center justify-between flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-700 truncate">{e.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.status === "NEW" ? "bg-amber-100 text-amber-700" :
                        e.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                        e.status === "REPLIED" ? "bg-green-100 text-green-700" :
                        "bg-stone-100 text-stone-500"
                      }`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{e.email}</p>
                    <p className="text-sm text-stone-500 mt-1 line-clamp-1">{e.message}</p>
                    <p className="text-xs text-stone-400 mt-1">{e.channel}</p>
                    {e.package?.currentVersion && (
                      <p className="text-xs text-forest-600 mt-1">Package: {e.package.currentVersion.title}</p>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    <p className="text-xs text-stone-400 mt-1">{timeAgo(new Date(e.createdAt))}</p>
                    {e.assignedTo && (
                      <p className="text-xs text-stone-400">{e.assignedTo.role} — {e.assignedTo.name}</p>
                    )}
                  </div>
                </Link>
                <Link
                  href={`/admin/enquiries/${e.id}`}
                  className="shrink-0 rounded-lg bg-forest-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-forest-800"
                >
                  Open details
                </Link>
                <Link
                  href={`/admin/quotes?enquiryId=${e.id}`}
                  className="shrink-0 rounded-lg border border-forest-200 px-2.5 py-1.5 text-xs font-medium text-forest-700 hover:bg-forest-50"
                >
                  Quote builder
                </Link>
              </div>
            );
          })}
          {enquiries.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-stone-400">No enquiries found</p>
          )}
        </div>
      </div>
      {showCreate && <CreateEnquiry onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateEnquiry({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    channel: "EMAIL",
    name: "",
    email: "",
    phone: "",
    message: "",
    travelDates: "",
    adults: "",
    children: "",
    budget: "",
    privacyConsent: false,
    whatsappConsent: false,
  });

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        adults: form.adults || undefined,
        children: form.children || undefined,
        privacyConsent: form.privacyConsent,
        whatsappConsent: form.whatsappConsent,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "Could not create enquiry.");
      setSaving(false);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Add channel enquiry</h2>
            <p className="text-xs text-stone-500 mt-1">Log an enquiry received outside the website.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-stone-400 hover:text-stone-700">Close</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-stone-600">Channel
            <select value={form.channel} onChange={(e) => update("channel", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2">
              <option value="EMAIL">Email</option>
              <option value="CHAT">Chat</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Phone</option>
            </select>
          </label>
          <label className="text-sm text-stone-600">Name
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" />
          </label>
          <label className="text-sm text-stone-600">Email
            <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" />
          </label>
          <label className="text-sm text-stone-600">Phone
            <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" />
          </label>
          <label className="text-sm text-stone-600 sm:col-span-2">Original message
            <textarea required value={form.message} onChange={(e) => update("message", e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" />
          </label>
          <label className="text-sm text-stone-600">Travel dates
            <input value={form.travelDates} onChange={(e) => update("travelDates", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="e.g. December 2026" />
          </label>
          <label className="text-sm text-stone-600">Budget
            <input value={form.budget} onChange={(e) => update("budget", e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="e.g. INR 1,20,000" />
          </label>
          <label className="flex items-start gap-2 text-xs text-stone-500 sm:col-span-2">
            <input type="checkbox" checked={form.privacyConsent} onChange={(e) => setForm((current) => ({ ...current, privacyConsent: e.target.checked }))} className="mt-0.5 rounded border-stone-300 text-forest-600" />
            Privacy consent was captured for this enquiry
          </label>
          <label className="flex items-start gap-2 text-xs text-stone-500 sm:col-span-2">
            <input type="checkbox" checked={form.whatsappConsent} onChange={(e) => setForm((current) => ({ ...current, whatsappConsent: e.target.checked }))} className="mt-0.5 rounded border-stone-300 text-forest-600" />
            WhatsApp follow-up consent was captured
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
          <button disabled={saving} className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save enquiry"}
          </button>
        </div>
      </form>
    </div>
  );
}
