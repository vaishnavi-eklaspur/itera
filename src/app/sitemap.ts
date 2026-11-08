import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://itera.vercel.app").replace(/\/$/, "");

  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });
  const posts = await db.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true, category: true, tags: true },
  });
  const categoryDates = new Map<string, Date>();
  const tagDates = new Map<string, Date>();
  for (const post of posts) {
    const currentCategoryDate = categoryDates.get(post.category);
    if (!currentCategoryDate || post.updatedAt > currentCategoryDate) {
      categoryDates.set(post.category, post.updatedAt);
    }
    for (const tag of post.tags) {
      const currentTagDate = tagDates.get(tag);
      if (!currentTagDate || post.updatedAt > currentTagDate) {
        tagDates.set(tag, post.updatedAt);
      }
    }
  }

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/packages`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...packages.map((p) => ({
      url: `${base}/packages/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...Array.from(categoryDates, ([category, lastModified]) => ({
      url: `${base}/blog/category/${encodeURIComponent(category)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...Array.from(tagDates, ([tag, lastModified]) => ({
      url: `${base}/blog/tag/${encodeURIComponent(tag)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
