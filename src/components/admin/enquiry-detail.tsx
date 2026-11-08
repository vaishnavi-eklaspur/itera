"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bot, User, StickyNote, MapPin, ArrowLeft, RefreshCw, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { timeAgo, responseTimeBadge } from "@/lib/utils";

type AIExtracted = {
  destination?: string | null;
  dates?: { start?: string | null; end?: string | null; flexible?: boolean; raw?: string | null } | null;
  additionalDays?: number | null;
  adults?: number | null;
  children?: number | null;
  budget?: { total?: number | null; perPerson?: number | null; currency?: string } | null;
  requirements?: string[];
  confidence?: number;
  [key: string]: unknown;
};

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
  aiExtracted: AIExtracted | null;
  aiDraftReply: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  package: { currentVersion: { title: string } | null } | null;
  notes: { id: string; content: string; createdAt: string; author: { name: string } }[];
  replies: { id: string; content: string; channel: string; sentAt: string; author: { name: string } }[];
};

type SuggestedPackage = {
  id: string;
  slug: string;
  currentVersion: { title: string; destination: string; days: number } | null;
  seasonalPrices: { pricePerPerson: number; seasonName: string; basis: string }[];
  suggestion?: { reasons: string[]; pricePerPerson: number | null; seasonName: string | null; basis: string | null };
};

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const level = pct >= 75 ? "high" : pct >= 40 ? "medium" : "low";
  const cls = level === "high" ? "bg-green-100 text-green-700" : level === "medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{pct}% {level}</span>;
}

function EditableField({ label, value, onSave, lowConfidence }: {
  label: string; value: string; onSave: (v: string) => void; lowConfidence?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const isEmpty = !value || value === "—";
  return (
    <div className={`rounded-lg p-3 ${lowConfidence ? "bg-amber-50 ring-1 ring-amber-200" : "bg-white"}`}>
      <p className="text-xs text-stone-400 capitalize mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input value={draft} onChange={e => setDraft(e.target.value)} className="flex-1 text-sm border border-stone-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-forest-500" autoFocus />
          <button onClick={() => { onSave(draft); setEditing(false); }} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between group">
          <p className={`text-sm font-medium ${isEmpty ? "text-stone-300 italic" : "text-stone-700"}`}>{isEmpty ? "Not detected" : value}</p>
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-forest-600 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

function flattenExtracted(ai: AIExtracted): { key: string; label: string; value: string }[] {
  const fields: { key: string; label: string; value: string }[] = [];
  if (ai.destination != null) fields.push({ key: "destination", label: "Destination", value: String(ai.destination ?? "") });
  if (ai.dates) {
    const d = ai.dates;
    const raw = d.raw || [d.start, d.end].filter(Boolean).join(" – ") || "";
    fields.push({ key: "dates", label: "Travel dates", value: raw + (d.flexible ? " (flexible)" : "") });
  }
  if (ai.additionalDays != null) {
    fields.push({
      key: "additionalDays",
      label: "Additional days",
      value: ai.additionalDays > 0 ? `${ai.additionalDays} day(s) requested` : "Package duration",
    });
  }
  if (ai.adults != null) fields.push({ key: "adults", label: "Adults", value: String(ai.adults) });
  if (ai.children != null) fields.push({ key: "children", label: "Children", value: String(ai.children) });
  if (ai.budget) {
    const b = ai.budget;
    const amt = b.total ? `${b.currency ?? "INR"} ${b.total.toLocaleString()}` : b.perPerson ? `${b.currency ?? "INR"} ${b.perPerson.toLocaleString()}/person` : "";
    fields.push({ key: "budget", label: "Budget", value: amt });
  }
  if (ai.requirements?.length) fields.push({ key: "requirements", label: "Requirements", value: ai.requirements.join(", ") });
  return fields;
}

export function EnquiryDetail({
  enquiry,
  admins,
  suggestedPackages,
}: {
  enquiry: Enquiry;
  admins: { id: string; name: string }[];
  suggestedPackages: SuggestedPackage[];
}) {
  const router = useRouter();
  const [replyContent, setReplyContent] = useState(enquiry.aiDraftReply ?? "");
  const [noteContent, setNoteContent] = useState("");
  const [sending, setSending] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [localExtracted, setLocalExtracted] = useState<AIExtracted | null>(enquiry.aiExtracted);
  const firstReplyAt = enquiry.replies.length > 0 ? new Date(enquiry.replies[enquiry.replies.length - 1].sentAt) : null;
  const badge = responseTimeBadge(new Date(enquiry.createdAt), firstReplyAt);
  const confidence = typeof localExtracted?.confidence === "number" ? localExtracted.confidence : undefined;

  async function saveField(key: string, value: string) {
    if (!localExtracted) return;
    const updated = { ...localExtracted };
    if (key === "destination") updated.destination = value;
    else if (key === "adults") updated.adults = parseInt(value) || null;
    else if (key === "children") updated.children = parseInt(value) || null;
    else if (key === "additionalDays") updated.additionalDays = parseInt(value) || 0;
    else if (key === "dates") updated.dates = { ...updated.dates, raw: value };
    else if (key === "budget") updated.budget = { ...updated.budget, total: parseInt(value.replace(/\D/g, "")) || null };
    else if (key === "requirements") updated.requirements = value.split(",").map((s: string) => s.trim()).filter(Boolean);
    setLocalExtracted(updated);
    await fetch(`/api/admin/enquiries/${enquiry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiExtracted: updated }),
    });
  }

  async function retryAI() {
    setRetrying(true);
    try {
      await fetch(`/api/admin/enquiries/${enquiry.id}/extract`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  async function sendReply() {
    setSending(true);
    await fetch(`/api/admin/enquiries/${enquiry.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent, channel: "EMAIL" }),
    });
    setSending(false);
    router.refresh();
  }

  async function addNote() {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    await fetch(`/api/admin/enquiries/${enquiry.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent }),
    });
    setNoteContent("");
    setAddingNote(false);
    router.refresh();
  }

  async function updateStatus(status: string) {
    await fetch(`/api/admin/enquiries/${enquiry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function assignTo(userId: string) {
    await fetch(`/api/admin/enquiries/${enquiry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: userId || null }),
    });
    router.refresh();
  }

  const aiFields = localExtracted ? flattenExtracted(localExtracted) : [];
  const isLowConfidence = (confidence ?? 0) < 0.4;

  return (
    <div>
      <Link href="/admin/enquiries" className="flex items-center gap-1 text-sm text-stone-500 hover:text-forest-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Enquiries
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{enquiry.name}</h1>
          <p className="text-sm text-stone-400">{enquiry.email} {enquiry.phone && `· ${enquiry.phone}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            enquiry.status === "NEW" ? "bg-amber-100 text-amber-700" :
            enquiry.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
            enquiry.status === "REPLIED" ? "bg-green-100 text-green-700" :
            "bg-stone-100 text-stone-500"
          }`}>
            {enquiry.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Original message */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-stone-400" />
              <span className="text-sm font-medium text-stone-700">Original Message</span>
              <span className="text-xs text-stone-400">{timeAgo(new Date(enquiry.createdAt))}</span>
            </div>
            <p className="text-sm text-stone-600 whitespace-pre-wrap">{enquiry.message}</p>
          </section>

          {/* AI Extraction — inline editable */}
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">AI Extracted Fields</span>
                {confidence != null && <ConfidenceBadge value={confidence} />}
              </div>
              <button onClick={retryAI} disabled={retrying} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50">
                {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {retrying ? "Re-analyzing..." : "Retry AI"}
              </button>
            </div>
            <p className="text-xs text-blue-500 mb-3">Fields extracted by AI — review and correct before using.</p>
            {aiFields.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {aiFields.map(f => (
                  <EditableField
                    key={f.key}
                    label={f.label}
                    value={f.value}
                    onSave={v => saveField(f.key, v)}
                    lowConfidence={isLowConfidence}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-blue-600">No fields extracted yet.</p>
                <button onClick={retryAI} disabled={retrying} className="mt-2 text-sm text-blue-700 hover:text-blue-900 font-medium">
                  {retrying ? "Analyzing..." : "Run AI Extraction"}
                </button>
              </div>
            )}
          </section>

          {/* Suggested Packages */}
          {suggestedPackages.length > 0 && (
            <section className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest-600" /> AI Suggested Packages
              </h2>
              <div className="space-y-2">
                {suggestedPackages.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between bg-forest-50 rounded-lg px-4 py-2">
                    <div>
                      <p className="text-sm font-medium text-forest-800">{sp.currentVersion?.title}</p>
                      <p className="text-xs text-forest-600">{sp.currentVersion?.destination} · {sp.currentVersion?.days} days</p>
                      {sp.suggestion?.pricePerPerson != null && (
                        <p className="text-xs text-stone-600 mt-1">
                          From ₹{sp.suggestion.pricePerPerson.toLocaleString("en-IN")}/person
                          {sp.suggestion.seasonName ? ` · ${sp.suggestion.seasonName}` : " · starting price"}
                        </p>
                      )}
                      {sp.suggestion?.reasons?.length ? (
                        <p className="text-xs text-stone-500 mt-1">{sp.suggestion.reasons.join(" · ")}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reply composer */}
          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">
              {enquiry.aiDraftReply ? "AI Draft Reply (edit before sending)" : "Reply"}
            </h2>
            <textarea
              rows={6}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
              placeholder="Write your reply..."
            />
            <button
              onClick={sendReply}
              disabled={sending || !replyContent.trim()}
              className="mt-3 flex items-center gap-1.5 bg-forest-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-700 disabled:opacity-50 transition"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Reply
            </button>
          </section>

          {/* Replies */}
          {enquiry.replies.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">Sent Replies</h2>
              {enquiry.replies.map((r) => (
                <div key={r.id} className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-green-600">{r.channel}</span>
                    <span className="text-xs text-green-600">{timeAgo(new Date(r.sentAt))} by {r.author.name}</span>
                  </div>
                  <p className="text-sm text-green-700 whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Status</label>
              <select
                value={enquiry.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              >
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REPLIED">Replied</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Assigned To</label>
              <select
                value={enquiry.assignedToId ?? ""}
                onChange={(e) => assignTo(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              >
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Internal Notes
            </h2>
            <div className="space-y-2 mb-3">
              {enquiry.notes.map((n) => (
                <div key={n.id} className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 mb-1">{n.author.name} · {timeAgo(new Date(n.createdAt))}</p>
                  <p className="text-sm text-stone-600">{n.content}</p>
                </div>
              ))}
              {enquiry.notes.length === 0 && <p className="text-xs text-stone-400">No notes yet</p>}
            </div>
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
              placeholder="Add a note..."
            />
            <button
              onClick={addNote}
              disabled={addingNote || !noteContent.trim()}
              className="mt-2 text-sm text-forest-600 hover:text-forest-700 font-medium disabled:opacity-50"
            >
              {addingNote ? "Adding..." : "Add Note"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
