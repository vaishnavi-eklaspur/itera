import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice — Itera",
  description: "How Itera uses and protects traveller enquiry information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-ivory px-4 py-12">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-forest-700 hover:text-forest-800">Back to Itera</Link>
        <h1 className="mt-6 text-3xl font-display font-semibold text-stone-900">Privacy notice</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          Itera collects the contact and trip details you submit so our travel team can respond to your enquiry,
          prepare recommendations and provide requested quotes. We do not sell this information.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-stone-900">Your choices</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          WhatsApp follow-ups are sent only when you give separate consent. You can ask us to correct or delete
          your enquiry information by contacting hello@itera.in.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-stone-900">Retention</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          We retain enquiry records only as long as needed for customer support, operational records and legal
          obligations, then securely remove or anonymise them.
        </p>
      </article>
    </main>
  );
}
