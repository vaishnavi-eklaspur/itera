"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Eye, EyeOff } from "lucide-react";
import { slugify } from "@/lib/utils";
import { SEO_DESCRIPTION_MAX_LENGTH, SEO_TITLE_MAX_LENGTH } from "@/lib/seo";

type BlogData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  relatedPackageIds: string[];
  published: boolean;
} | null;

type PackageOption = { id: string; title: string };

export function BlogEditor({ post, packages }: { post: BlogData; packages: PackageOption[] }) {
  const router = useRouter();
  const isNew = !post;

  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [category, setCategory] = useState(post?.category ?? "Destinations");
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [relatedPackageIds, setRelatedPackageIds] = useState<string[]>(post?.relatedPackageIds ?? []);
  const [published, setPublished] = useState(post?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkup(prefix: string, suffix = "") {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || "text";
    const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    if (seoTitle.length > SEO_TITLE_MAX_LENGTH || seoDescription.length > SEO_DESCRIPTION_MAX_LENGTH) {
      setError(`SEO title must be ${SEO_TITLE_MAX_LENGTH} characters or fewer and SEO description must be ${SEO_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
      setSaving(false);
      return;
    }
    if (relatedPackageIds.length === 0) {
      setError("Select at least one related package before saving this blog post.");
      setSaving(false);
      return;
    }
    try {
      const body = {
        title, excerpt, content, coverImage: coverImage || undefined,
        category, tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        seoTitle: seoTitle || undefined, seoDescription: seoDescription || undefined,
        relatedPackageIds, published,
        slug: isNew ? slugify(title) : post.slug,
      };
      const url = isNew ? "/api/admin/blog" : `/api/admin/blog/${post.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      const data = await res.json();
      if (isNew) router.push(`/admin/blog/${data.id}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">
          {isNew ? "New Blog Post" : `Edit: ${post?.title}`}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPublished(!published)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg ${published ? "border-green-200 text-green-700 bg-green-50" : "border-stone-200 text-stone-600"}`}
          >
            {published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {published ? "Published" : "Draft"}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-forest-700 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Excerpt</label>
              <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none" />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Content</label>
              <div className="flex flex-wrap gap-1 mb-2 rounded-lg border border-stone-200 bg-stone-50 p-1">
                {[
                  ["Bold", "**", "**"],
                  ["Italic", "*", "*"],
                  ["Heading", "## "],
                  ["List", "- "],
                  ["Link", "[", "](https://example.com)"],
                  ["Image", "![alt text](", ")"],
                ].map(([label, prefix, suffix = ""]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => insertMarkup(prefix, suffix)}
                    className="rounded px-2 py-1 text-xs text-stone-600 hover:bg-white hover:text-forest-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                ref={contentRef}
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500 resize-y"
              />
              <p className="mt-1 text-xs text-stone-400">Use the toolbar for formatting, links and images. Content remains portable Markdown.</p>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-900">Metadata</h2>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500">
                {["Destinations", "Travel Tips", "Food & Culture", "Adventure", "Honeymoon", "Family", "Budget"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Tags (comma-separated)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" placeholder="Kerala, Houseboat, Backwaters" />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">Cover Image URL</label>
              <input type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-900">SEO</h2>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">SEO Title</label>
              <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 ${seoTitle.length > SEO_TITLE_MAX_LENGTH ? "border-red-300" : "border-stone-200"}`} />
              <p className={`mt-1 text-xs ${seoTitle.length > SEO_TITLE_MAX_LENGTH ? "text-red-600" : "text-stone-400"}`}>{seoTitle.length}/{SEO_TITLE_MAX_LENGTH} characters</p>
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">SEO Description</label>
              <textarea rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none ${seoDescription.length > SEO_DESCRIPTION_MAX_LENGTH ? "border-red-300" : "border-stone-200"}`} />
              <p className={`mt-1 text-xs ${seoDescription.length > SEO_DESCRIPTION_MAX_LENGTH ? "text-red-600" : "text-stone-400"}`}>{seoDescription.length}/{SEO_DESCRIPTION_MAX_LENGTH} characters</p>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-900">Related Packages</h2>
            <p className="text-xs text-stone-500">Select the package or packages this article helps a traveller choose.</p>
            {packages.map((pkg) => (
              <label key={pkg.id} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={relatedPackageIds.includes(pkg.id)}
                  onChange={(e) => {
                    setRelatedPackageIds((prev) =>
                      e.target.checked ? [...prev, pkg.id] : prev.filter((id) => id !== pkg.id)
                    );
                  }}
                  className="rounded border-stone-300 text-forest-600 focus:ring-forest-500"
                />
                {pkg.title}
              </label>
            ))}
            {packages.length === 0 && <p className="text-sm text-amber-700">No packages are available to link yet.</p>}
            {relatedPackageIds.length === 0 && <p className="text-xs text-red-600">At least one package is required.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
