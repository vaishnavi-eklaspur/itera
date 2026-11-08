import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import Link from "next/link";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Blog — Itera Travel",
  description: "Travel stories, tips and guides for Kerala and South India.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Itera Travel",
    description: "Travel stories, tips and guides for Kerala and South India.",
    type: "website",
    images: [{
      url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=500&fit=crop&auto=format&q=80",
      width: 1600,
      height: 500,
      alt: "South India landscape",
    }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=500&fit=crop&auto=format&q=80"],
  },
};

export const instant = false;

export default async function BlogPage() {
  "use cache";
  cacheLife("minutes");

  const posts = await db.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const categories = [...new Set(posts.map((p) => p.category))];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="relative h-[36vh] min-h-[260px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=500&fit=crop&auto=format&q=80"
          alt="South India landscape"
          fill
          priority
          sizes="100vw"
          className="object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
        <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.15em] uppercase text-white/70 mb-2">Stories &amp; Guides</p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Travel Blog</h1>
            <p className="mt-2 text-[15px] text-white/70">Stories, tips and guides for your South India journey</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {categories.map((cat) => (
              <Link key={cat} href={`/blog/category/${encodeURIComponent(cat)}`} className="text-xs bg-forest-50 text-forest-700 px-3 py-1 rounded-full font-medium hover:bg-forest-100">{cat}</Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-16 text-stone-400">No blog posts yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => <BlogPostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
