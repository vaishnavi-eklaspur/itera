"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Eye, EyeOff, Edit3 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { SEO_DESCRIPTION_MAX_LENGTH, SEO_TITLE_MAX_LENGTH } from "@/lib/seo";
import { blogHtmlToMarkdown, markdownToBlogHtml, safeBlogLink } from "@/lib/blog-markdown";

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
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Only rehydrate when switching back into the editor; typing must not reset the caret.
  useEffect(() => {
    if (!showPreview && contentRef.current) {
      contentRef.current.innerHTML = markdownToBlogHtml(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);

  function runEditorCommand(command: string, value?: string) {
    contentRef.current?.focus();
    document.execCommand(command, false, value);
    if (contentRef.current) setContent(blogHtmlToMarkdown(contentRef.current, window.location.origin));
  }

  function renderInlineMarkdown(value: string, keyPrefix: string) {
    const nodes: ReactNode[] = [];
    let cursor = 0;
    const pattern = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

    for (const match of value.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > cursor) nodes.push(<span key={`${keyPrefix}-text-${cursor}`}>{value.slice(cursor, index)}</span>);
      if (match[1] && match[2]) {
        const href = safeBlogLink(match[2]);
        nodes.push(href
          ? <a key={`${keyPrefix}-link-${index}`} href={href} target="_blank" rel="noopener noreferrer">{match[1]}</a>
          : <span key={`${keyPrefix}-text-${index}`}>{match[0]}</span>);
      } else if (match[3]) {
        nodes.push(<strong key={`${keyPrefix}-bold-${index}`}>{match[3]}</strong>);
      } else if (match[4]) {
        nodes.push(<em key={`${keyPrefix}-italic-${index}`}>{match[4]}</em>);
      }
      cursor = index + match[0].length;
    }
    if (cursor < value.length) nodes.push(<span key={`${keyPrefix}-text-${cursor}`}>{value.slice(cursor)}</span>);
    return nodes;
  }

  function renderPreviewContent(markdown: string) {
    const lines = markdown.split("\n");
    const nodes: React.ReactNode[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.startsWith("- ")) {
        const items: ReactNode[] = [];
        while (index < lines.length && lines[index].startsWith("- ")) {
          items.push(<li key={`list-${index}`} className="text-sm leading-7 text-stone-700">{renderInlineMarkdown(lines[index].slice(2), `list-${index}`)}</li>);
          index += 1;
        }
        index -= 1;
        nodes.push(<ul key={`ul-${index}`} className="ml-5 list-disc">{items}</ul>);
      } else if (line.startsWith("# ")) {
        nodes.push(<h1 key={index} className="text-2xl font-semibold text-stone-900">{renderInlineMarkdown(line.slice(2), `h1-${index}`)}</h1>);
      } else if (line.startsWith("## ")) {
        nodes.push(<h2 key={index} className="text-xl font-semibold text-stone-900">{renderInlineMarkdown(line.slice(3), `h2-${index}`)}</h2>);
      } else if (line.startsWith("### ")) {
        nodes.push(<h3 key={index} className="text-lg font-semibold text-stone-900">{renderInlineMarkdown(line.slice(4), `h3-${index}`)}</h3>);
      } else if (!line.trim()) {
        nodes.push(<div key={index} className="h-3" />);
      } else {
        nodes.push(<p key={index} className="text-sm leading-7 text-stone-700">{renderInlineMarkdown(line, `p-${index}`)}</p>);
      }
    }
    return nodes;
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
        const savedContent = contentRef.current && !showPreview
          ? blogHtmlToMarkdown(contentRef.current, window.location.origin)
          : content;
        const body = {
          title, excerpt, content: savedContent, coverImage: coverImage || undefined,
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
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm text-stone-600">Content</label>
              <button
                type="button"
                onClick={() => setShowPreview((current) => !current)}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:border-forest-300 hover:text-forest-700"
              >
                {showPreview ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? "Edit content" : "Preview"}
              </button>
            </div>
            {!showPreview && <div className="flex flex-wrap gap-1 mb-2 rounded-lg border border-stone-200 bg-stone-50 p-1">
              {[
                  ["Bold", "bold"],
                  ["Italic", "italic"],
                  ["Heading", "formatBlock"],
                  ["List", "insertUnorderedList"],
                ].map(([label, command]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => runEditorCommand(command, command === "formatBlock" ? "H2" : undefined)}
                    className="rounded px-2 py-1 text-xs text-stone-600 hover:bg-white hover:text-forest-700"
                  >
                    {label}
                  </button>
                ))}
                <button type="button" onClick={() => {
                  const url = window.prompt("Link URL");
                  if (url) {
                    const href = safeBlogLink(url, window.location.origin);
                    if (!href) {
                      setError("Enter a valid HTTP, HTTPS, or mailto link.");
                      return;
                    }
                    runEditorCommand("createLink", href);
                  }
                }} className="rounded px-2 py-1 text-xs text-stone-600 hover:bg-white hover:text-forest-700">Link</button>
              </div>
              }
              {showPreview ? (
                <div className="min-h-[384px] space-y-2 rounded-lg border border-stone-200 bg-white p-5">
                  {content ? renderPreviewContent(content) : <p className="text-sm italic text-stone-400">Start writing to see the rendered article preview.</p>}
                </div>
              ) : (
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => setContent(blogHtmlToMarkdown(event.currentTarget, window.location.origin))}
                  className="min-h-[384px] w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 prose prose-sm max-w-none"
                  aria-label="Blog content rich text editor"
                />
              )}
              <p className="mt-1 text-xs text-stone-400">Use the visual editor to format headings, emphasis, lists and links. Existing Markdown posts remain supported.</p>
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
