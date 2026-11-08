import Link from "next/link";
import { Package, Inbox, BarChart3, Home, FileText, ClipboardList, Activity } from "lucide-react";
import { requireAdminRole } from "@/lib/admin-access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminRole("ADMIN", "EDITOR", "CONSULTANT");
  const role = session.user.role;

  return (
    <div className="min-h-screen bg-stone-50/80">
      {/* Top bar */}
      <header aria-label="Admin navigation" className="bg-white/95 backdrop-blur-lg border-b border-stone-200/60 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
        <div className="flex items-center justify-between h-[52px]">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-[1.1rem] font-display font-bold text-forest-800 tracking-tight">Itera</Link>
            <nav className="hidden sm:flex items-center gap-0.5 text-[13px]">
              {(role === "ADMIN" || role === "CONSULTANT") && <NavLink href="/admin" icon={Home}>Home</NavLink>}
              {(role === "ADMIN" || role === "CONSULTANT") && <NavLink href="/admin/packages" icon={Package}>Packages</NavLink>}
              {(role === "ADMIN" || role === "CONSULTANT") && <NavLink href="/admin/enquiries" icon={Inbox}>Enquiries</NavLink>}
              {(role === "ADMIN" || role === "EDITOR") && <NavLink href="/admin/blog" icon={FileText}>Blog</NavLink>}
              {(role === "ADMIN" || role === "CONSULTANT") && <NavLink href="/admin/quotes" icon={ClipboardList}>Quotes</NavLink>}
              {(role === "ADMIN" || role === "CONSULTANT") && <NavLink href="/admin/analytics" icon={BarChart3}>Analytics</NavLink>}
              {role === "ADMIN" && <NavLink href="/admin/activity" icon={Activity}>Activity</NavLink>}
            </nav>
          </div>
          <Link href="/" className="text-xs text-stone-400 hover:text-forest-600 transition link-slide">
            View Site
          </Link>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="sm:hidden flex border-b border-stone-200/60 bg-white">
        {(role === "ADMIN" || role === "CONSULTANT") && <MobileNavLink href="/admin" icon={Home}>Home</MobileNavLink>}
        {(role === "ADMIN" || role === "CONSULTANT") && <MobileNavLink href="/admin/packages" icon={Package}>Packages</MobileNavLink>}
        {(role === "ADMIN" || role === "CONSULTANT") && <MobileNavLink href="/admin/enquiries" icon={Inbox}>Enquiries</MobileNavLink>}
        {(role === "ADMIN" || role === "EDITOR") && <MobileNavLink href="/admin/blog" icon={FileText}>Blog</MobileNavLink>}
        {(role === "ADMIN" || role === "CONSULTANT") && <MobileNavLink href="/admin/analytics" icon={BarChart3}>Analytics</MobileNavLink>}
      </nav>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-stone-500 hover:bg-forest-50 hover:text-forest-700 transition text-[13px]">
      <Icon className="w-3.5 h-3.5" />
      {children}
    </Link>
  );
}

function MobileNavLink({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] text-stone-400 hover:text-forest-700 transition">
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
