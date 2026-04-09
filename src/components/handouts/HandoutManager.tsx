"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ReactMarkdown from "react-markdown";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Handout {
  id: string;
  title: string;
  content_type: string;
  content: string;
  stage: string;
  category: string;
  published_at: string | null;
  storage_path: string | null;
  file_name: string | null;
  session_id: string | null;
  created_at: string;
}

interface ReadCount {
  handout_id: string;
  count: number;
}

interface Props {
  campaignId: string;
  initialHandouts: Handout[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Category = "general" | "lore" | "letter" | "map" | "rules";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General" },
  { value: "lore", label: "Lore" },
  { value: "letter", label: "Letter" },
  { value: "map", label: "Map" },
  { value: "rules", label: "Rules" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-700 text-gray-300",
  lore: "bg-purple-900/60 text-purple-300",
  letter: "bg-amber-900/60 text-amber-300",
  map: "bg-emerald-900/60 text-emerald-300",
  rules: "bg-blue-900/60 text-blue-300",
};

type CreationMethod = "write" | "upload-md" | "upload-image" | "template";

type TemplateName =
  | "letter"
  | "notice"
  | "journal"
  | "inscription"
  | "map-legend";

const TEMPLATES: { name: TemplateName; label: string; content: string; category: Category }[] = [
  {
    name: "letter",
    label: "Letter",
    category: "letter",
    content: `# A Letter

---

*Dearest reader,*

Write the body of the letter here. Describe the handwriting, the ink color, and the condition of the parchment.

*Yours faithfully,*
*— The Author*

---

*The parchment is slightly worn and smells of lavender.*`,
  },
  {
    name: "notice",
    label: "Notice / Poster",
    category: "general",
    content: `# NOTICE

## By Order of the Town Council

Write the content of the posted notice here. Describe any official seals, stamps, or other markings.

---

**Posted:** *Date unknown*
**Authority:** *The Town Council*`,
  },
  {
    name: "journal",
    label: "Journal Entry",
    category: "lore",
    content: `# Journal Entry

**Date:** *Unknown*

---

Write the journal entry here. Consider the voice and personality of the writer.

The handwriting grows more erratic toward the end of the entry...

---

*The remaining pages are blank.*`,
  },
  {
    name: "inscription",
    label: "Inscription",
    category: "lore",
    content: `# Inscription

> *Carved into the stone in an ancient script:*

Write the inscription text here. Consider whether the characters can read the language.

---

*The letters are worn but still legible. Moss grows in the deeper grooves.*`,
  },
  {
    name: "map-legend",
    label: "Map Legend",
    category: "map",
    content: `# Map Legend

## Key Locations

1. **Location A** — Description
2. **Location B** — Description
3. **Location C** — Description

## Notable Features

- **Feature 1:** Description
- **Feature 2:** Description

## Scale

*Each square represents 5 feet.*

---

*The map is drawn on rough parchment with faded ink.*`,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HandoutManager({ campaignId, initialHandouts }: Props) {
  // -- state ----------------------------------------------------------------
  const [handouts, setHandouts] = useState<Handout[]>(initialHandouts);
  const [readCounts, setReadCounts] = useState<ReadCount[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  // creation dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creationMethod, setCreationMethod] = useState<CreationMethod | null>(null);

  // editor state (used for create + edit)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHandout, setEditingHandout] = useState<Handout | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [contentType, setContentType] = useState<string>("markdown");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // image upload
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // -- data fetching --------------------------------------------------------

  const fetchReadCounts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("handout_reads")
      .select("handout_id")
      .in(
        "handout_id",
        handouts.filter((h) => h.stage === "published").map((h) => h.id)
      );

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((row: { handout_id: string }) => {
        counts[row.handout_id] = (counts[row.handout_id] || 0) + 1;
      });
      setReadCounts(
        Object.entries(counts).map(([handout_id, count]) => ({
          handout_id,
          count,
        }))
      );
    }
  }, [handouts]);

  const fetchPlayerCount = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("campaign_members")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("role", "player");
    setPlayerCount(count ?? 0);
  }, [campaignId]);

  useEffect(() => {
    fetchReadCounts();
    fetchPlayerCount();
  }, [fetchReadCounts, fetchPlayerCount]);

  // -- helpers --------------------------------------------------------------

  function getReadCount(handoutId: string): number {
    return readCounts.find((r) => r.handout_id === handoutId)?.count ?? 0;
  }

  function resetEditor() {
    setTitle("");
    setContent("");
    setCategory("general");
    setContentType("markdown");
    setShowPreview(false);
    setEditingHandout(null);
    setEditorOpen(false);
    setCreationMethod(null);
    setShowCreateDialog(false);
  }

  // -- group handouts by stage ----------------------------------------------

  const staged = handouts.filter((h) => h.stage === "staged");
  const published = handouts
    .filter((h) => h.stage === "published")
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
    );
  const drafts = handouts
    .filter((h) => h.stage === "draft")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // -- CRUD -----------------------------------------------------------------

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("handouts")
      .insert({
        campaign_id: campaignId,
        title: title.trim(),
        content_type: contentType,
        content,
        stage: "draft",
        category,
      })
      .select("*")
      .single();

    if (data && !error) {
      setHandouts((prev) => [...prev, data as Handout]);
      resetEditor();
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editingHandout) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("handouts")
      .update({ title, content, category })
      .eq("id", editingHandout.id);

    if (!error) {
      setHandouts((prev) =>
        prev.map((h) =>
          h.id === editingHandout.id ? { ...h, title, content, category } : h
        )
      );
      resetEditor();
    }
    setSaving(false);
  }

  async function handleSetStage(
    handout: Handout,
    newStage: "draft" | "staged" | "published"
  ) {
    const supabase = createClient();
    const updates: Record<string, unknown> = { stage: newStage };

    if (newStage === "published") {
      updates.published_at = new Date().toISOString();
    } else if (newStage === "draft") {
      updates.published_at = null;
    }

    const { error } = await supabase
      .from("handouts")
      .update(updates)
      .eq("id", handout.id);

    if (!error) {
      setHandouts((prev) =>
        prev.map((h) =>
          h.id === handout.id
            ? {
                ...h,
                stage: newStage,
                published_at:
                  newStage === "published"
                    ? (updates.published_at as string)
                    : newStage === "draft"
                      ? null
                      : h.published_at,
              }
            : h
        )
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this handout?")) return;
    const supabase = createClient();
    await supabase.from("handouts").delete().eq("id", id);
    setHandouts((prev) => prev.filter((h) => h.id !== id));
  }

  // -- file upload handlers -------------------------------------------------

  async function handleMdFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const name = file.name.replace(/\.md$/i, "");

    setTitle(name);
    setContent(text);
    setContentType("markdown");
    setCreationMethod(null);
    setShowCreateDialog(false);
    setEditorOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaign_id", campaignId);

    try {
      const res = await fetch("/api/handouts/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        setUploadingImage(false);
        return;
      }

      const { storage_path, public_url } = await res.json();

      // Create the handout with the image
      const supabase = createClient();
      const { data, error } = await supabase
        .from("handouts")
        .insert({
          campaign_id: campaignId,
          title: file.name.replace(/\.[^.]+$/, ""),
          content_type: "image",
          content: public_url,
          stage: "draft",
          category: "map",
          storage_path,
          file_name: file.name,
        })
        .select("*")
        .single();

      if (data && !error) {
        setHandouts((prev) => [...prev, data as Handout]);
        resetEditor();
      }
    } catch {
      alert("Image upload failed. Please try again.");
    }

    setUploadingImage(false);
  }

  function startEdit(handout: Handout) {
    setEditingHandout(handout);
    setTitle(handout.title);
    setContent(handout.content);
    setCategory((handout.category as Category) || "general");
    setContentType(handout.content_type);
    setShowPreview(false);
    setEditorOpen(true);
    setShowCreateDialog(false);
  }

  function openCreateDialog() {
    resetEditor();
    setShowCreateDialog(true);
  }

  function selectCreationMethod(method: CreationMethod) {
    if (method === "write") {
      setCreationMethod(null);
      setShowCreateDialog(false);
      setEditorOpen(true);
    } else if (method === "upload-md") {
      fileInputRef.current?.click();
    } else if (method === "upload-image") {
      imageInputRef.current?.click();
    } else if (method === "template") {
      setCreationMethod("template");
    }
  }

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setTitle("");
    setContent(template.content);
    setCategory(template.category);
    setContentType("markdown");
    setCreationMethod(null);
    setShowCreateDialog(false);
    setEditorOpen(true);
  }

  // -- render helpers -------------------------------------------------------

  function renderCategoryBadge(cat: string) {
    const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}
      >
        {cat}
      </span>
    );
  }

  function renderHandoutCard(handout: Handout) {
    const isPublished = handout.stage === "published";
    const isStaged = handout.stage === "staged";
    const isDraft = handout.stage === "draft";
    const isImage = handout.content_type === "image";

    return (
      <div
        key={handout.id}
        className="rounded-lg bg-gray-900 border border-gray-800 p-4"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-100 truncate">
              {handout.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {renderCategoryBadge(handout.category || "general")}
              <span className="text-[11px] text-gray-500">
                {new Date(handout.created_at).toLocaleDateString()}
              </span>
              {isPublished && playerCount > 0 && (
                <span className="text-[11px] text-gray-400">
                  Read by {getReadCount(handout.id)}/{playerCount} players
                </span>
              )}
            </div>
          </div>

          {/* Quick-publish lightning bolt for staged items */}
          {isStaged && (
            <button
              onClick={() => handleSetStage(handout, "published")}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-amber-600 text-gray-950 hover:bg-amber-500 transition-colors"
              title="Publish now"
            >
              <span className="text-lg">⚡</span>
            </button>
          )}
        </div>

        {/* Content preview */}
        {!isImage && handout.content && (
          <p className="mt-2 text-sm text-gray-400 line-clamp-2">
            {handout.content.slice(0, 150)}
            {handout.content.length > 150 ? "..." : ""}
          </p>
        )}
        {isImage && handout.content && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={handout.content}
              alt={handout.title}
              className="max-h-24 rounded border border-gray-700 object-cover"
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {!isImage && (
            <button
              onClick={() => startEdit(handout)}
              className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Edit
            </button>
          )}

          {isDraft && (
            <button
              onClick={() => handleSetStage(handout, "staged")}
              className="rounded bg-amber-900/50 px-3 py-1 text-xs text-amber-300 hover:bg-amber-900 transition-colors"
            >
              Stage
            </button>
          )}
          {isStaged && (
            <button
              onClick={() => handleSetStage(handout, "draft")}
              className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Unstage
            </button>
          )}

          {!isPublished && (
            <button
              onClick={() => handleSetStage(handout, "published")}
              className="rounded bg-green-900/50 px-3 py-1 text-xs text-green-300 hover:bg-green-900 transition-colors"
            >
              Publish
            </button>
          )}
          {isPublished && (
            <button
              onClick={() => handleSetStage(handout, "draft")}
              className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Unpublish
            </button>
          )}

          <button
            onClick={() => handleDelete(handout.id)}
            className="rounded bg-gray-800 px-3 py-1 text-xs text-red-400 hover:bg-gray-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // -- main render ----------------------------------------------------------

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Handouts</h1>
            <p className="mt-1 text-sm text-gray-400">
              Create and publish handouts for your players
            </p>
          </div>
          <button
            onClick={openCreateDialog}
            className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-amber-500 transition-colors"
          >
            New Handout
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={handleMdFileUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* ============================================================ */}
        {/* CREATION DIALOG (modal overlay) */}
        {/* ============================================================ */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-gray-100">
                  {creationMethod === "template"
                    ? "Choose Template"
                    : "New Handout"}
                </h2>
                <button
                  onClick={resetEditor}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-5">
                {/* Top-level creation methods */}
                {creationMethod !== "template" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => selectCreationMethod("write")}
                      className="flex flex-col items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4 text-center hover:border-amber-600 hover:bg-gray-800/80 transition-colors"
                    >
                      <span className="text-2xl">✍️</span>
                      <span className="text-sm font-medium text-gray-200">
                        Write
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Markdown editor
                      </span>
                    </button>

                    <button
                      onClick={() => selectCreationMethod("upload-md")}
                      className="flex flex-col items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4 text-center hover:border-amber-600 hover:bg-gray-800/80 transition-colors"
                    >
                      <span className="text-2xl">📄</span>
                      <span className="text-sm font-medium text-gray-200">
                        Upload .md
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Markdown file
                      </span>
                    </button>

                    <button
                      onClick={() => selectCreationMethod("upload-image")}
                      disabled={uploadingImage}
                      className="flex flex-col items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4 text-center hover:border-amber-600 hover:bg-gray-800/80 transition-colors disabled:opacity-50"
                    >
                      <span className="text-2xl">🖼️</span>
                      <span className="text-sm font-medium text-gray-200">
                        {uploadingImage ? "Uploading..." : "Upload Image"}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        PNG, JPG, WebP
                      </span>
                    </button>

                    <button
                      onClick={() => selectCreationMethod("template")}
                      className="flex flex-col items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4 text-center hover:border-amber-600 hover:bg-gray-800/80 transition-colors"
                    >
                      <span className="text-2xl">📋</span>
                      <span className="text-sm font-medium text-gray-200">
                        Template
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Pre-filled formats
                      </span>
                    </button>
                  </div>
                )}

                {/* Template picker */}
                {creationMethod === "template" && (
                  <div className="space-y-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => applyTemplate(t)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left hover:border-amber-600 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-200">
                          {t.label}
                        </span>
                        {renderCategoryBadge(t.category)}
                      </button>
                    ))}
                    <button
                      onClick={() => setCreationMethod(null)}
                      className="mt-2 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EDITOR (modal overlay) */}
        {/* ============================================================ */}
        {editorOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 sm:px-6">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingHandout ? "Edit Handout" : "New Handout"}
              </h2>
              <div className="flex items-center gap-2">
                {/* Preview toggle (mobile) */}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 sm:hidden transition-colors"
                >
                  {showPreview ? "Editor" : "Preview"}
                </button>
                <button
                  onClick={resetEditor}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Title + category row */}
            <div className="flex flex-col gap-3 border-b border-gray-800 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Handout title"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-amber-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Editor + preview area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Textarea — hidden on mobile when preview is active */}
              <div
                className={`flex-1 min-h-0 ${showPreview ? "hidden sm:flex" : "flex"} flex-col`}
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write markdown content..."
                  className="flex-1 w-full resize-none bg-gray-950 px-4 py-3 font-mono text-sm text-gray-100 placeholder-gray-600 focus:outline-none sm:px-6"
                />
              </div>

              {/* Preview pane — side-by-side on desktop, fullscreen on mobile */}
              <div
                className={`flex-1 min-h-0 border-l border-gray-800 overflow-y-auto ${showPreview ? "block" : "hidden sm:block"}`}
              >
                <div className="prose prose-invert prose-amber max-w-none px-4 py-3 sm:px-6 prose-headings:text-amber-400 prose-a:text-amber-400 prose-strong:text-gray-200 prose-p:text-gray-300 prose-li:text-gray-300 prose-blockquote:border-amber-600 prose-blockquote:text-gray-400 prose-code:text-amber-300 prose-hr:border-gray-700">
                  {content ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-600 italic">
                      Preview will appear here...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-800 px-4 py-3 sm:px-6">
              <button
                onClick={resetEditor}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingHandout ? handleUpdate : handleCreate}
                disabled={saving || !title.trim()}
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-gray-950 hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? "Saving..."
                  : editingHandout
                    ? "Update"
                    : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* HANDOUT LIST — grouped by stage */}
        {/* ============================================================ */}

        {/* Ready to Reveal (staged) */}
        {staged.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                Ready to Reveal
              </h2>
              <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-300">
                {staged.length}
              </span>
            </div>
            <div className="space-y-3 rounded-xl border border-amber-900/40 bg-amber-950/10 p-3">
              {staged.map((h) => renderHandoutCard(h))}
            </div>
          </section>
        )}

        {/* Published */}
        {published.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-green-400">
                Published
              </h2>
              <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-300">
                {published.length}
              </span>
            </div>
            <div className="space-y-3">
              {published.map((h) => renderHandoutCard(h))}
            </div>
          </section>
        )}

        {/* Drafts */}
        {drafts.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Drafts
              </h2>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400">
                {drafts.length}
              </span>
            </div>
            <div className="space-y-3">
              {drafts.map((h) => renderHandoutCard(h))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {handouts.length === 0 && !showCreateDialog && !editorOpen && (
          <div className="rounded-lg bg-gray-900 border border-gray-800 p-8 text-center">
            <p className="text-gray-400">No handouts yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Create handouts to share with your players.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
