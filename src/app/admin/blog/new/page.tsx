import { db } from "@/lib/db";
import { BlogEditor } from "@/components/admin/blog-editor";
import { requireAdminRole } from "@/lib/admin-access";

export default async function NewBlogPage() {
  await requireAdminRole("ADMIN", "EDITOR");
  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    include: { currentVersion: { select: { title: true } } },
  });
  const packageOptions = packages.filter((p) => p.currentVersion).map((p) => ({ id: p.id, title: p.currentVersion!.title }));

  return <BlogEditor post={null} packages={packageOptions} />;
}
