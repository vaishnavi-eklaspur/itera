"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

export function EnquiryForm({
  packageId,
  packageTitle,
  initialName = "",
  initialEmail = "",
}: {
  packageId: string;
  packageTitle: string;
  initialName?: string;
  initialEmail?: string;
}) {
  const [form, setForm] = useState({
    name: initialName,
    email: initialEmail,
    phone: "",
    travelDates: "",
    adults: "",
    children: "",
    budget: "",
    message: `I'm interested in the "${packageTitle}" package. I'm looking for a trip that includes:`,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          adults: form.adults ? Number(form.adults) : undefined,
          children: form.children !== "" ? Number(form.children) : undefined,
          packageId,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-forest-50 border border-forest-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Send className="w-5 h-5 text-forest-600" />
        </div>
        <h3 className="font-semibold text-forest-800">Enquiry Sent!</h3>
        <p className="text-sm text-forest-600 mt-1">We&apos;ll get back to you within the hour.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6">
      <h3 className="font-semibold text-stone-900 mb-4">Send an Enquiry</h3>
      <div className="space-y-3">
        <input
          id="enquiry-name"
          type="text"
          required
          placeholder="Your Name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-stone-500">
            Travel date (optional)
            <input
              type="date"
              value={form.travelDates}
              onChange={(e) => setForm({ ...form, travelDates: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </label>
          <label className="text-xs text-stone-500">
            Adults (optional)
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="50"
              placeholder="Number of adults"
              value={form.adults}
              onChange={(e) => setForm({ ...form, adults: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </label>
          <label className="text-xs text-stone-500">
            Children (optional)
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="20"
              placeholder="Number of children"
              value={form.children}
              onChange={(e) => setForm({ ...form, children: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </label>
          <input
            type="text"
            placeholder="Budget (optional)"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
        </div>
        <textarea
          required
          rows={4}
          placeholder="Tell us about your trip..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-500 mt-2">Something went wrong. Please try again.</p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full mt-4 bg-forest-700 text-white py-3 rounded-lg font-medium hover:bg-forest-700 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "sending" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
        ) : (
          <><Send className="w-4 h-4" /> Send Enquiry</>
        )}
      </button>
    </form>
  );
}
