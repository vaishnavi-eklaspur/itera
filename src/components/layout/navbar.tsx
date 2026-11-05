"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-teal-700">
              Itera
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/packages"
              className="text-sm text-slate-600 hover:text-teal-700 transition"
            >
              Packages
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-4">
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin/enquiries"
                    className="text-sm text-slate-600 hover:text-teal-700 transition flex items-center gap-1"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                {session.user.role === "TRAVELLER" && (
                  <Link
                    href="/my-enquiries"
                    className="text-sm text-slate-600 hover:text-teal-700 transition"
                  >
                    My Enquiries
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="w-4 h-4" />
                  {session.user.name}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm text-slate-400 hover:text-red-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/packages"
              className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
              onClick={() => setMenuOpen(false)}
            >
              Packages
            </Link>
            {session?.user ? (
              <>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin/enquiries"
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                {session.user.role === "TRAVELLER" && (
                  <Link
                    href="/my-enquiries"
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
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
                className="block px-3 py-2 text-sm text-teal-600 font-medium hover:bg-teal-50 rounded-lg"
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
