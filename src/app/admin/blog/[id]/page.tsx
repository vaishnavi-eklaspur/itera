import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BlogEditor } from "@/components/admin/blog-editor";

export const instant = false;

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await db.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    include: { currentVersion: { select: { title: true } } },
  });
  const packageOptions = packages.filter((p) => p.currentVersion).map((p) => ({ id: p.id, title: p.currentVersion!.title }));

  return <BlogEditor post={post} packages={packageOptions} />;
}
