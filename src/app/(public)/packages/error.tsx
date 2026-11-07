"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function PackagesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-900">Something went wrong</h2>
          <p className="text-sm text-stone-500">We couldn&apos;t load the packages. Please try again.</p>
          <button onClick={reset} className="px-4 py-2 bg-forest-700 text-white text-sm font-medium rounded-lg hover:bg-forest-700 transition">
            Try again
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
