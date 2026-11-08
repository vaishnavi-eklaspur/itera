"use client";

import { useState } from "react";

export function QuoteActions({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyPublicLink() {
    const url = `${window.location.origin}/quote/${token}`;
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copiedSuccessfully = document.execCommand("copy");
      input.remove();
      if (copiedSuccessfully) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } else {
        setCopyFailed(true);
      }
    }
  }

  return (
    <div className="flex justify-end gap-2 mb-4 print:hidden">
      <button
        type="button"
        onClick={copyPublicLink}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        {copied ? "Link copied" : copyFailed ? "Copy failed" : "Copy public link"}
      </button>
      <a
        href={`/api/quotes/${token}/pdf`}
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
