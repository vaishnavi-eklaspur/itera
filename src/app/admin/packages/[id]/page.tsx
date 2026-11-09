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
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!pkg) notFound();

  const draftVersion = pkg.draftVersionId
    ? pkg.versions.find((version) => version.id === pkg.draftVersionId) ?? null
    : pkg.scheduledAt
      ? pkg.versions[0] ?? null
      : null;

  return (
    <PackageEditor
      pkg={JSON.parse(JSON.stringify({
        ...pkg,
        draftVersion,
        draftPrices: draftVersion ? pkg.seasonalPrices.filter((price) => !price.isActive) : null,
        seasonalPrices: pkg.seasonalPrices.filter((price) => price.isActive),
        versions: pkg.versions.map((version) => ({
          ...version,
          currentOf: version.id === pkg.currentVersionId ? { id: pkg.id } : null,
          draftOf: version.id === pkg.draftVersionId ? { id: pkg.id } : null,
        })),
      }))}
      readOnly={session.user.role === "CONSULTANT"}
    />
  );
}
