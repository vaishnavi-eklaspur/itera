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
  const versions = await db.packageVersion.findMany({
    select: { destination: true },
    distinct: ["destination"],
  });
  return versions.map((v) => v.destination);
}

export default async function PackagesPage() {
  const [packages, destinations] = await Promise.all([getPackages(), getDestinations()]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-800 to-emerald-900 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white">Travel Packages</h1>
            <p className="mt-2 text-teal-200">
              {packages.length} curated journeys across South India
            </p>
          </div>
        </div>
        <PackageGrid packages={JSON.parse(JSON.stringify(packages))} destinations={destinations} />
      </main>
      <Footer />
    </div>
  );
}
