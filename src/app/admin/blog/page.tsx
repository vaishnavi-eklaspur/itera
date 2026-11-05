import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export const instant = false;

export default async function AdminBlogPage() {
  const posts = await db.blogPost.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Blog Posts</h1>
        <Link href="/admin/blog/new" className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wider">
          <span>Title</span>
          <span>Category</span>
          <span>Status</span>
          <span>Updated</span>
        </div>
        {posts.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No blog posts yet
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`/admin/blog/${post.id}`} className="grid grid-cols-[1fr,auto,auto,auto] gap-4 px-6 py-4 border-b border-slate-50 hover:bg-slate-50 items-center">
              <div>
                <p className="font-medium text-slate-900 text-sm">{post.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">by {post.author.name}</p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{post.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {post.published ? "Published" : "Draft"}
              </span>
              <span className="text-xs text-slate-400">{new Date(post.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
