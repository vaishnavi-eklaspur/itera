"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { timeAgo, responseTimeBadge } from "@/lib/utils";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
  package: { currentVersion: { title: string } | null } | null;
  assignedTo: { id: string; name: string; role: string } | null;
  replies: { sentAt: string }[];
};

export function EnquiryList({ enquiries, currentStatus }: { enquiries: Enquiry[]; currentStatus?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [loading, setLoading] = useState(false);
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
              </div>
            );
          })}
          {enquiries.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-stone-400">No enquiries found</p>
          )}
        </div>
      </div>
    </div>
  );
}
