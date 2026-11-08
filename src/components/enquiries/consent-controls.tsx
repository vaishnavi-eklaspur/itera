"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConsentControls({
  enquiryId,
  whatsappConsentAt,
  whatsappConsentWithdrawnAt,
}: {
  enquiryId: string;
  whatsappConsentAt: string | null;
  whatsappConsentWithdrawnAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdrawWhatsAppConsent() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/enquiries/${enquiryId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "WHATSAPP" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Consent withdrawal failed");
      }
      router.refresh();
    } catch (withdrawalError) {
      setError(withdrawalError instanceof Error ? withdrawalError.message : "Consent withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  if (!whatsappConsentAt || whatsappConsentWithdrawnAt) {
    return (
      <p className="text-xs text-stone-500">
        WhatsApp follow-ups: {whatsappConsentWithdrawnAt ? "withdrawn" : "not consented"}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={withdrawWhatsAppConsent}
        disabled={loading}
        className="text-xs text-forest-700 underline disabled:text-stone-400"
      >
        {loading ? "Withdrawing..." : "Withdraw WhatsApp consent"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
