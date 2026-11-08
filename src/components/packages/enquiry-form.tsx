"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

export function EnquiryForm({
  packageId,
  packageTitle,
  packageDays,
  initialName = "",
  initialEmail = "",
}: {
  packageId: string;
  packageTitle: string;
  packageDays: number;
  initialName?: string;
  initialEmail?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: initialName,
    email: initialEmail,
    phone: "",
    adults: "",
    children: "",
    budget: "",
    message: `I'm interested in the "${packageTitle}" package. I'm looking for a trip that includes:`,
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function getDefaultEndDate(start: string) {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + packageDays - 1);
    return date.toISOString().slice(0, 10);
  }

  function handleStartDateChange(start: string) {
    setStartDate(start);
    setEndDate(start ? getDefaultEndDate(start) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const travelDates = startDate && endDate
        ? `${startDate} to ${endDate}`
        : "";
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          travelDates,
          adults: form.adults ? Number(form.adults) : undefined,
          children: form.children !== "" ? Number(form.children) : undefined,
          packageId,
          privacyConsent,
          whatsappConsent,
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
            Start date (optional)
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </label>
          <label className="text-xs text-stone-500">
            End date (optional)
            <input
              type="date"
              min={startDate || today}
              value={endDate}
              disabled={!startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 disabled:bg-stone-50 disabled:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
            {startDate && <span className="block mt-1 text-[11px] text-stone-400">{packageDays}-day package default</span>}
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
        <label className="flex items-start gap-2 text-xs text-stone-500">
          <input
            type="checkbox"
            required
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className="mt-0.5 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
          />
          <span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer" className="text-forest-700 underline">privacy notice</a> and allow Itera to use my details to respond to this enquiry.</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-stone-500">
          <input
            type="checkbox"
            checked={whatsappConsent}
            onChange={(e) => setWhatsappConsent(e.target.checked)}
            className="mt-0.5 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
          />
          <span>I consent to receiving follow-ups on WhatsApp.</span>
        </label>
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
