import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PackageGrid } from "@/components/packages/package-grid";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel Packages",
  description: "Explore handcrafted holiday packages across Kerala, Tamil Nadu, Karnataka and Goa.",
};

export const instant = false;

async function getPackages() {
  return db.package.findMany({
    where: { status: "PUBLISHED" },
    include: {
      currentVersion: true,
      seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" } },
      _count: { select: { enquiries: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getDestinations() {
  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    select: { currentVersion: { select: { destination: true } } },
  });
  return [...new Set(packages.map((p) => p.currentVersion?.destination).filter(Boolean))] as string[];
}

export default async function PackagesPage() {
  const [packages, destinations] = await Promise.all([getPackages(), getDestinations()]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        {/* Hero — photo-led */}
        <div className="relative h-[44vh] min-h-[300px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=700&fit=crop&auto=format&q=85"
            alt="South India landscape"
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
          <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div>
              <p className="section-label text-forest-300/80 mb-3">All Packages</p>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight">Explore South India</h1>
              <p className="mt-3 text-[15px] text-white/70 max-w-lg">
                {packages.length} handcrafted journeys through Kerala, Tamil Nadu, Karnataka &amp; Goa
              </p>
            </div>
          </div>
        </div>
        <PackageGrid packages={JSON.parse(JSON.stringify(packages))} destinations={destinations} />
      </main>
      <Footer />
    </div>
  );
}
