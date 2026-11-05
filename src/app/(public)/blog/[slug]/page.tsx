import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Calendar, ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";

export const instant = false;

async function getPost(slug: string) {
  return db.blogPost.findUnique({
    where: { slug, published: true },
    include: { author: { select: { name: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    openGraph: { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, type: "article" },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const relatedPackages = post.relatedPackageIds.length > 0
    ? await db.package.findMany({
        where: { id: { in: post.relatedPackageIds }, status: "PUBLISHED" },
        include: {
          currentVersion: { select: { title: true, destination: true, days: true } },
          seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" }, take: 1 },
        },
      })
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <Link href="/blog" className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <span className="text-xs text-teal-600 font-medium">{post.category}</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">{post.title}</h1>
        <div className="flex items-center gap-3 mt-3 text-sm text-slate-400">
          <span>{post.author.name}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        {post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-4">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-8 prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-teal-600">
          {post.content.split("\n").map((para, i) => {
            if (para.startsWith("# ")) return <h1 key={i}>{para.slice(2)}</h1>;
            if (para.startsWith("## ")) return <h2 key={i}>{para.slice(3)}</h2>;
            if (para.startsWith("### ")) return <h3 key={i}>{para.slice(4)}</h3>;
            if (para.startsWith("- ")) return <li key={i}>{para.slice(2)}</li>;
            if (para.trim() === "") return <br key={i} />;
            return <p key={i}>{para}</p>;
          })}
        </div>

        {relatedPackages.length > 0 && (
          <section className="mt-12 pt-8 border-t border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Related Packages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPackages.map((pkg) => {
                const v = pkg.currentVersion;
                if (!v) return null;
                const price = pkg.seasonalPrices[0]?.pricePerPerson;
                return (
                  <Link key={pkg.id} href={`/packages/${pkg.slug}`} className="flex gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-teal-300" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm">{v.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{v.destination} · {v.days} Days</p>
                      {price && <p className="text-sm font-semibold text-teal-700 mt-1">{formatPrice(price)}<span className="text-xs font-normal text-slate-400">/person</span></p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
