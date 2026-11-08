import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BlogPostCard, type PublicBlogPost } from "@/components/blog/blog-post-card";
import { db } from "@/lib/db";

export const instant = false;

async function getPosts(category: string) {
  return db.blogPost.findMany({
    where: { published: true, category },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  return {
    title: `${category} Travel Articles`,
    description: `Travel articles and guides about ${category} from Itera Travel.`,
    alternates: { canonical: `/blog/category/${encodeURIComponent(category)}` },
  };
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const posts = await getPosts(category);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <Link href="/blog" className="text-sm text-forest-600 hover:text-forest-700">Back to Blog</Link>
        <p className="text-xs text-forest-600 font-medium uppercase tracking-wider mt-8">Category</p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 mt-2">{category}</h1>
        <p className="text-stone-500 mt-2">Travel articles and guides from Itera.</p>
        {posts.length === 0 ? (
          <p className="text-sm text-stone-400 mt-12">No published articles in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {posts.map((post) => <BlogPostCard key={post.id} post={post as PublicBlogPost} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
