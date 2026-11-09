"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Copy, Eye, Loader2, Pencil, Upload } from "lucide-react";

type Props = {
  id: string;
  slug: string;
  status: string;
  canManage: boolean;
};

export function PackageListActions({ id, slug, status, canManage }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"preview" | "duplicate" | "archive" | "publish" | null>(null);
  const [error, setError] = useState("");

  async function handlePreview() {
    setPendingAction("preview");
    setError("");
    try {
      const response = await fetch(`/api/admin/packages/${id}/preview`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create package preview.");
      router.push(`/packages/preview/${data.token}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not create package preview.");
      setPendingAction(null);
    }
  }

  async function handleDuplicate() {
    setPendingAction("duplicate");
    setError("");
    try {
      const response = await fetch(`/api/admin/packages/${id}/duplicate`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not duplicate package.");
      router.push(`/admin/packages/${data.id}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not duplicate package.");
      setPendingAction(null);
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${slug}"? It will no longer appear on the public site.`)) return;
    setPendingAction("archive");
    setError("");
    try {
      const response = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not archive package.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not archive package.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePublish() {
    setPendingAction("publish");
    setError("");
    try {
      const response = await fetch(`/api/admin/packages/${id}/publish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish package.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not publish package.");
    } finally {
      setPendingAction(null);
    }
  }

  const actionClass = "inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-forest-700 disabled:cursor-wait disabled:opacity-50";

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1">
        <Link href={`/admin/packages/${id}`} aria-label="Edit package" title="Edit package" className={actionClass}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={handlePreview}
          disabled={pendingAction !== null}
          aria-label="Preview package"
          title="Preview package"
          className={actionClass}
        >
          {pendingAction === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
        {canManage && (
          <>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={pendingAction !== null}
              aria-label="Duplicate package"
              title="Duplicate package"
              className={actionClass}
            >
              {pendingAction === "duplicate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            </button>
            {status !== "PUBLISHED" && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={pendingAction !== null}
                aria-label={status === "ARCHIVED" ? "Publish archived package" : "Publish package"}
                title={status === "ARCHIVED" ? "Restore and publish package" : "Publish package"}
                className={actionClass}
              >
                {pendingAction === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload aria-hidden="true" className="h-4 w-4" />}
              </button>
            )}
            {status !== "ARCHIVED" && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={pendingAction !== null}
                aria-label="Archive package"
                title="Archive package"
                className={`${actionClass} hover:text-red-700`}
              >
                {pendingAction === "archive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive aria-hidden="true" className="h-4 w-4" />}
              </button>
            )}
          </>
        )}
      </div>
      {error && <span role="alert" className="max-w-48 text-left text-xs text-red-600">{error}</span>}
    </div>
  );
}
