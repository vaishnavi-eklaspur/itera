import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-teal-700 mb-3">Itera</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Handcrafted holiday packages across Kerala and South India.
              Local experts, honest pricing, unforgettable journeys.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/packages" className="block text-sm text-slate-500 hover:text-teal-600 transition">
                All Packages
              </Link>
              <Link href="/packages?destination=Kerala" className="block text-sm text-slate-500 hover:text-teal-600 transition">
                Kerala Packages
              </Link>
              <Link href="/packages?destination=Karnataka" className="block text-sm text-slate-500 hover:text-teal-600 transition">
                Karnataka Packages
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-slate-500">
              <p>Kochi, Kerala, India</p>
              <p>hello@itera.in</p>
              <p>+91 98470 12345</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Itera Travel. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
