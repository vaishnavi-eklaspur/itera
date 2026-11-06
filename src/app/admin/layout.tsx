import Link from "next/link";
import { Package, Inbox, BarChart3, Home, FileText, ClipboardList, Activity } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-teal-700">Itera</Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <NavLink href="/admin" icon={Home}>Dashboard</NavLink>
              <NavLink href="/admin/packages" icon={Package}>Packages</NavLink>
              <NavLink href="/admin/enquiries" icon={Inbox}>Enquiries</NavLink>
              <NavLink href="/admin/blog" icon={FileText}>Blog</NavLink>
              <NavLink href="/admin/quotes" icon={ClipboardList}>Quotes</NavLink>
              <NavLink href="/admin/analytics" icon={BarChart3}>Analytics</NavLink>
              <NavLink href="/admin/activity" icon={Activity}>Activity</NavLink>
            </nav>
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
            View Site
          </Link>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="sm:hidden flex border-b border-slate-200 bg-white">
        <MobileNavLink href="/admin" icon={Home}>Home</MobileNavLink>
        <MobileNavLink href="/admin/packages" icon={Package}>Packages</MobileNavLink>
        <MobileNavLink href="/admin/enquiries" icon={Inbox}>Enquiries</MobileNavLink>
        <MobileNavLink href="/admin/blog" icon={FileText}>Blog</MobileNavLink>
        <MobileNavLink href="/admin/analytics" icon={BarChart3}>Analytics</MobileNavLink>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-teal-700 transition">
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}

function MobileNavLink({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-slate-500 hover:text-teal-700">
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
