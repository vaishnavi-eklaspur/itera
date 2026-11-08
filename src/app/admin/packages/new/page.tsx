import { PackageEditor } from "@/components/admin/package-editor";
import { requireAdminRole } from "@/lib/admin-access";

export default async function NewPackagePage() {
  await requireAdminRole("ADMIN");
  return <PackageEditor pkg={null} />;
}
