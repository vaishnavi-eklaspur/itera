import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BlogPostCard, type PublicBlogPost } from "@/components/blog/blog-post-card";
import { db } from "@/lib/db";

export const instant = false;

async function getPosts(tag: string) {
  return db.blogPost.findMany({
    where: { published: true, tags: { has: tag } },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `${tag} Travel Articles`,
    description: `Travel articles and guides tagged ${tag} from Itera Travel.`,
    alternates: { canonical: `/blog/tag/${encodeURIComponent(tag)}` },
  };
}

export default async function BlogTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = await getPosts(tag);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <Link href="/blog" className="text-sm text-forest-600 hover:text-forest-700">Back to Blog</Link>
        <p className="text-xs text-forest-600 font-medium uppercase tracking-wider mt-8">Tag</p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 mt-2">{tag}</h1>
        <p className="text-stone-500 mt-2">Travel articles and guides from Itera.</p>
        {posts.length === 0 ? (
          <p className="text-sm text-stone-400 mt-12">No published articles use this tag yet.</p>
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
