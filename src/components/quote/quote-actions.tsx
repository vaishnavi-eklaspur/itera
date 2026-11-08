"use client";

export function QuoteActions({ token }: { token: string }) {
  return (
    <div className="flex justify-end gap-2 mb-4 print:hidden">
      <a
        href={`/api/quotes/${token}/pdf`}
        download
        className="rounded-lg border border-forest-700 px-4 py-2 text-sm font-medium text-forest-700 hover:bg-forest-50"
      >
        Download branded PDF
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
      >
        Print quote
      </button>
    </div>
  );
}
