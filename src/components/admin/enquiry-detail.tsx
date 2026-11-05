"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bot, User, StickyNote, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { timeAgo, responseTimeBadge } from "@/lib/utils";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
  aiExtracted: Record<string, any> | null;
  aiDraftReply: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  package: { currentVersion: { title: string } | null } | null;
  notes: { id: string; content: string; createdAt: string; author: { name: string } }[];
  replies: { id: string; content: string; channel: string; sentAt: string; author: { name: string } }[];
};

type SuggestedPackage = {
  id: string;
  currentVersion: { title: string; destination: string; days: number } | null;
};

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
  const firstReplyAt = enquiry.replies.length > 0 ? new Date(enquiry.replies[enquiry.replies.length - 1].sentAt) : null;
  const badge = responseTimeBadge(new Date(enquiry.createdAt), firstReplyAt);
  const aiExtracted = enquiry.aiExtracted as Record<string, any> | null;
  const confidence = aiExtracted?.confidence as number | undefined;

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

  return (
    <div>
      <Link href="/admin/enquiries" className="flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Enquiries
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{enquiry.name}</h1>
          <p className="text-sm text-slate-400">{enquiry.email} {enquiry.phone && `· ${enquiry.phone}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            enquiry.status === "NEW" ? "bg-amber-100 text-amber-700" :
            enquiry.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
            enquiry.status === "REPLIED" ? "bg-green-100 text-green-700" :
            "bg-slate-100 text-slate-500"
          }`}>
            {enquiry.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Original message */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Original Message</span>
              <span className="text-xs text-slate-400">{timeAgo(new Date(enquiry.createdAt))}</span>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{enquiry.message}</p>
          </section>

          {/* AI Extraction */}
          {aiExtracted && (
            <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">AI Extracted Fields</span>
                {confidence != null && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {Math.round(confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(aiExtracted).filter(([k]) => k !== "confidence").map(([key, value]) => (
                  <div key={key} className="bg-white rounded-lg p-3">
                    <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm font-medium text-slate-700">
                      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Suggested Packages */}
          {suggestedPackages.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" /> AI Suggested Packages
              </h2>
              <div className="space-y-2">
                {suggestedPackages.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between bg-teal-50 rounded-lg px-4 py-2">
                    <div>
                      <p className="text-sm font-medium text-teal-800">{sp.currentVersion?.title}</p>
                      <p className="text-xs text-teal-600">{sp.currentVersion?.destination} · {sp.currentVersion?.days} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reply composer */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              {enquiry.aiDraftReply ? "AI Draft Reply (edit before sending)" : "Reply"}
            </h2>
            <textarea
              rows={6}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="Write your reply..."
            />
            <button
              onClick={sendReply}
              disabled={sending || !replyContent.trim()}
              className="mt-3 flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Reply
            </button>
          </section>

          {/* Replies */}
          {enquiry.replies.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Sent Replies</h2>
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
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <select
                value={enquiry.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REPLIED">Replied</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Assigned To</label>
              <select
                value={enquiry.assignedToId ?? ""}
                onChange={(e) => assignTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Internal Notes
            </h2>
            <div className="space-y-2 mb-3">
              {enquiry.notes.map((n) => (
                <div key={n.id} className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 mb-1">{n.author.name} · {timeAgo(new Date(n.createdAt))}</p>
                  <p className="text-sm text-slate-600">{n.content}</p>
                </div>
              ))}
              {enquiry.notes.length === 0 && <p className="text-xs text-slate-400">No notes yet</p>}
            </div>
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="Add a note..."
            />
            <button
              onClick={addNote}
              disabled={addingNote || !noteContent.trim()}
              className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
            >
              {addingNote ? "Adding..." : "Add Note"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
