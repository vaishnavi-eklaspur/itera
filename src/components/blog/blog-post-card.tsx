import Link from "next/link";
import { Calendar, Tag } from "lucide-react";
import Image from "next/image";
import { isSeoImageUrl } from "@/lib/seo";

export type PublicBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  createdAt: Date | string;
  author: { name: string };
};

export function BlogPostCard({ post }: { post: PublicBlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group bg-white rounded-2xl border border-stone-200/50 overflow-hidden hover:shadow-xl transition-all duration-500">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-forest-100 to-forest-200 flex items-center justify-center overflow-hidden">
        {post.coverImage ? (
          isSeoImageUrl(post.coverImage) ? (
            <Image src={post.coverImage} alt={`${post.title} cover`} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px" className="object-cover img-zoom" />
          ) : (
            <img src={post.coverImage} alt={`${post.title} cover`} className="w-full h-full object-cover img-zoom" />
          )
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
  );
}
