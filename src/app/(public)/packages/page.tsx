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
      <main className="flex-1">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 py-20 px-4">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-40" />
          <div className="relative max-w-7xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Explore South India</h1>
            <p className="mt-3 text-lg text-teal-200 max-w-2xl mx-auto">
              {packages.length} handcrafted journeys through Kerala, Tamil Nadu, Karnataka &amp; Goa
            </p>
          </div>
        </div>
        <PackageGrid packages={JSON.parse(JSON.stringify(packages))} destinations={destinations} />
      </main>
      <Footer />
    </div>
  );
}
