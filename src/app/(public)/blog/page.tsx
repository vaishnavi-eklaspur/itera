import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import Link from "next/link";
import { Calendar, Tag } from "lucide-react";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Itera Travel",
  description: "Travel stories, tips and guides for Kerala and South India.",
  alternates: { canonical: "/blog" },
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
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=500&fit=crop&auto=format&q=80"
          alt="South India landscape"
          className="absolute inset-0 w-full h-full object-cover scale-105"
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
              <span key={cat} className="text-xs bg-forest-50 text-forest-700 px-3 py-1 rounded-full font-medium">{cat}</span>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-16 text-stone-400">No blog posts yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-white rounded-2xl border border-stone-200/50 overflow-hidden hover:shadow-xl transition-all duration-500">
                <div className="aspect-[16/10] bg-gradient-to-br from-forest-100 to-forest-200 flex items-center justify-center overflow-hidden">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover img-zoom" />
                  ) : (
                    <Tag className="w-10 h-10 text-forest-300" />
                  )}
                </div>
                <div className="p-5">
                  <span className="text-xs text-forest-600 font-medium">{post.category}</span>
                  <h2 className="font-display font-semibold text-stone-900 mt-1 group-hover:text-forest-700 transition line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-stone-500 mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-stone-400">
                    <span>{post.author.name}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
