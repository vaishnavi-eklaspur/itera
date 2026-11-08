import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Calendar, ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { isSeoImageUrl } from "@/lib/seo";

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
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      ...(post.coverImage ? { images: [{ url: post.coverImage, alt: post.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const relatedPackages = post.relatedPackageIds.length > 0
    ? await db.package.findMany({
        where: { id: { in: post.relatedPackageIds }, status: "PUBLISHED" },
        include: {
          currentVersion: { select: { title: true, destination: true, days: true, photos: true } },
          seasonalPrices: { where: { isActive: true }, orderBy: { pricePerPerson: "asc" }, take: 1 },
        },
      })
    : [];
  const base = process.env.NEXTAUTH_URL || "https://itera.vercel.app";
  const postUrl = `${base}/blog/${post.slug}`;
  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${postUrl}#article`,
    url: postUrl,
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: "Itera", url: base },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    ...(post.coverImage ? { image: [post.coverImage] } : {}),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <main className="relative z-10 bg-ivory max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <Link href="/blog" className="flex items-center gap-1 text-sm text-forest-600 hover:text-forest-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <span className="text-xs text-forest-600 font-medium">{post.category}</span>
        <h1 className="text-3xl font-bold text-stone-900 mt-2">{post.title}</h1>
        <div className="flex items-center gap-3 mt-3 text-sm text-stone-400">
          <span>{post.author.name}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        {post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-4">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog/tag/${encodeURIComponent(tag)}`} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full hover:bg-stone-200">{tag}</Link>
            ))}
          </div>
        )}

        {post.coverImage && (
          <div className="mt-8 overflow-hidden rounded-2xl bg-stone-100">
            {isSeoImageUrl(post.coverImage) ? (
              <Image src={post.coverImage} alt={`${post.title} cover`} width={1600} height={900} sizes="(max-width: 768px) 100vw, 768px" className="w-full aspect-[16/9] object-cover" priority />
            ) : (
              <img src={post.coverImage} alt={`${post.title} cover`} className="w-full aspect-[16/9] object-cover" />
            )}
          </div>
        )}

        <div className="mt-8 prose prose-slate max-w-none prose-headings:text-stone-900 prose-a:text-forest-600">
          {post.content.split("\n").map((para, i) => {
            if (para.startsWith("# ")) return <h1 key={i}>{renderInline(para.slice(2))}</h1>;
            if (para.startsWith("## ")) return <h2 key={i}>{renderInline(para.slice(3))}</h2>;
            if (para.startsWith("### ")) return <h3 key={i}>{renderInline(para.slice(4))}</h3>;
            if (para.startsWith("- ")) return <li key={i}>{renderInline(para.slice(2))}</li>;
            if (para.trim() === "") return <br key={i} />;
            return <p key={i}>{renderInline(para)}</p>;
          })}
        </div>

        {relatedPackages.length > 0 && (
          <section className="mt-12 pt-8 border-t border-stone-100">
            <h2 className="text-xl font-semibold text-stone-900 mb-4">Related Packages</h2>
            <p className="text-sm text-stone-600 mb-5">
              Ready to experience this route? Explore the package details or send us your dates and we will tailor it for you.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPackages.map((pkg) => {
                const v = pkg.currentVersion;
                if (!v) return null;
                const price = pkg.seasonalPrices[0]?.pricePerPerson;
                const packagePhoto = (v.photos as string[])?.[0];
                return (
                  <div key={pkg.id} className="p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition">
                    <Link href={`/packages/${pkg.slug}`} className="flex gap-4">
                      <div className="relative w-16 h-16 bg-gradient-to-br from-forest-100 to-forest-200 rounded-lg overflow-hidden shrink-0">
                        {packagePhoto ? (
                          isSeoImageUrl(packagePhoto) ? (
                            <Image src={packagePhoto} alt={`${v.title} package`} fill sizes="64px" className="object-cover" />
                          ) : (
                            <img src={packagePhoto} alt={`${v.title} package`} className="absolute inset-0 w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-forest-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-stone-900 text-sm">{v.title}</h3>
                        <p className="text-xs text-stone-500 mt-0.5">{v.destination} · {v.days} Days</p>
                        {price && <p className="text-sm font-semibold text-forest-700 mt-1">{formatPrice(price)}<span className="block text-xs font-normal text-stone-400">Per person</span></p>}
                      </div>
                    </Link>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/packages/${pkg.slug}`} className="rounded-lg bg-forest-700 px-3 py-2 text-xs font-medium text-white hover:bg-forest-800">
                        View package
                      </Link>
                      <Link href={`/packages/${pkg.slug}#enquiry-name`} className="rounded-lg border border-forest-200 px-3 py-2 text-xs font-medium text-forest-700 hover:bg-white">
                        Enquire now
                      </Link>
                    </div>
                  </div>
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
