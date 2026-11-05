import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import Link from "next/link";
import { Calendar, Tag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Itera Travel",
  description: "Travel stories, tips and guides for Kerala and South India.",
};

export const instant = false;

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const categories = [...new Set(posts.map((p) => p.category))];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-gradient-to-br from-teal-800 to-emerald-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Travel Blog</h1>
          <p className="mt-2 text-teal-200">Stories, tips and guides for your South India journey</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {categories.map((cat) => (
              <span key={cat} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium">{cat}</span>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No blog posts yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all">
                <div className="aspect-[16/10] bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <Tag className="w-10 h-10 text-teal-300" />
                  )}
                </div>
                <div className="p-5">
                  <span className="text-xs text-teal-600 font-medium">{post.category}</span>
                  <h2 className="font-semibold text-slate-900 mt-1 group-hover:text-teal-700 transition line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
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
