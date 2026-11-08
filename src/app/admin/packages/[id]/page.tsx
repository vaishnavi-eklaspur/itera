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
      seasonalPrices: { where: { isActive: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 10, select: { id: true, versionNumber: true, title: true, createdAt: true } },
    },
  });

  if (!pkg) notFound();

  return (
    <PackageEditor
      pkg={JSON.parse(JSON.stringify(pkg))}
      readOnly={session.user.role === "CONSULTANT"}
    />
  );
}
