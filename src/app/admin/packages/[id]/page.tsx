import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PackageEditor } from "@/components/admin/package-editor";
import { requireAdminRole } from "@/lib/admin-access";

export const instant = false;

export default async function AdminPackageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminRole("ADMIN", "CONSULTANT");
  const { id } = await params;

  const pkg = await db.package.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      seasonalPrices: true,
      versions: { orderBy: { versionNumber: "desc" }, take: 10 },
    },
  });

  if (!pkg) notFound();

  return (
    <PackageEditor
      pkg={JSON.parse(JSON.stringify({
        ...pkg,
        scheduledVersion: pkg.scheduledAt ? pkg.versions[0] ?? null : null,
        scheduledPrices: pkg.scheduledAt ? pkg.seasonalPrices.filter((price) => !price.isActive) : null,
        seasonalPrices: pkg.seasonalPrices.filter((price) => price.isActive),
      }))}
      readOnly={session.user.role === "CONSULTANT"}
    />
  );
}
