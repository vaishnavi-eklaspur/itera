import Link from "next/link";
import { CurrentYear } from "./current-year";

export function Footer() {
  return (
    <footer aria-label="Site footer" className="bg-forest-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-display font-semibold text-white mb-3">Itera</h3>
            <p className="text-sm text-forest-300 leading-relaxed">
              Handcrafted holiday packages across Kerala and South India.
              Local experts, honest pricing, unforgettable journeys.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-forest-200 mb-3">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/packages" prefetch className="block text-sm text-forest-300 hover:text-white transition">
                All Packages
              </Link>
              <Link href="/packages?destination=Kerala" prefetch className="block text-sm text-forest-300 hover:text-white transition">
                Kerala Packages
              </Link>
              <Link href="/packages?destination=Karnataka" prefetch className="block text-sm text-forest-300 hover:text-white transition">
                Karnataka Packages
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-forest-200 mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-forest-300">
              <p>Kochi, Kerala, India</p>
              <p>hello@itera.in</p>
              <p>+91 98470 12345</p>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-forest-800/60 text-center text-xs text-forest-500">
          &copy; <CurrentYear /> Itera Travel. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
