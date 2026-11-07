"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 bg-ivory/90 backdrop-blur-lg border-b border-sand-200/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px]">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[1.35rem] font-display font-bold tracking-tight text-forest-800">
              Itera
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/packages" className="text-[13px] text-stone-500 hover:text-forest-700 transition link-slide">
              Packages
            </Link>
            <Link href="/blog" className="text-[13px] text-stone-500 hover:text-forest-700 transition link-slide">
              Blog
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-4">
                {["ADMIN", "EDITOR", "CONSULTANT"].includes(session.user.role as string) && (
                  <Link
                    href="/admin/enquiries"
                    className="text-sm text-stone-600 hover:text-forest-700 transition flex items-center gap-1"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                {session.user.role === "TRAVELLER" && (
                  <Link
                    href="/my-enquiries"
                    className="text-sm text-stone-600 hover:text-forest-700 transition"
                  >
                    My Enquiries
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <User className="w-4 h-4" />
                  {session.user.name}
                </div>
                <button
                  aria-label="Sign out"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm text-stone-400 hover:text-red-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg hover:bg-forest-800 transition"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="md:hidden p-2 text-stone-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/packages" className="block px-3 py-2 text-sm text-stone-600 hover:bg-forest-50 rounded-lg" onClick={() => setMenuOpen(false)}>
              Packages
            </Link>
            <Link href="/blog" className="block px-3 py-2 text-sm text-stone-600 hover:bg-forest-50 rounded-lg" onClick={() => setMenuOpen(false)}>
              Blog
            </Link>
            {session?.user ? (
              <>
                {["ADMIN", "EDITOR", "CONSULTANT"].includes(session.user.role as string) && (
                  <Link
                    href="/admin/enquiries"
                    className="block px-3 py-2 text-sm text-stone-600 hover:bg-forest-50 rounded-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                {session.user.role === "TRAVELLER" && (
                  <Link
                    href="/my-enquiries"
                    className="block px-3 py-2 text-sm text-stone-600 hover:bg-forest-50 rounded-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Enquiries
                  </Link>
                )}
                <button
                  onClick={() => { signOut({ callbackUrl: "/" }); setMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-3 py-2 text-sm text-forest-700 font-medium hover:bg-forest-50 rounded-lg"
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
