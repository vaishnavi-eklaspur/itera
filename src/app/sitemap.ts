import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL || "https://itera.vercel.app";

  const packages = await db.package.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });
  const posts = await db.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true, category: true, tags: true },
  });
  const categories = [...new Set(posts.map((post) => post.category))];
  const tags = [...new Set(posts.flatMap((post) => post.tags))];

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
    ...categories.map((category) => ({
      url: `${base}/blog/category/${encodeURIComponent(category)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...tags.map((tag) => ({
      url: `${base}/blog/tag/${encodeURIComponent(tag)}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
