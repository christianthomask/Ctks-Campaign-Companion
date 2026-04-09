"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Handout {
  id: string;
  title: string;
  content_type: string;
  content: string;
  published_at: string | null;
  created_at: string;
}

interface Props {
  campaignId: string;
  initialHandouts: Handout[];
}

export function HandoutManager({ campaignId, initialHandouts }: Props) {
  const [handouts, setHandouts] = useState(initialHandouts);
  const [editing, setEditing] = useState<Handout | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("handouts")
      .insert({
        campaign_id: campaignId,
        title: title.trim(),
        content_type: "markdown",
        content: content,
      })
      .select("*")
      .single();

    if (data && !error) {
      setHandouts((prev) => [...prev, data as Handout]);
      setTitle("");
      setContent("");
      setCreating(false);
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editing) return;
    setSaving(true);

    const supabase = createClient();
    await supabase
      .from("handouts")
      .update({ title, content })
      .eq("id", editing.id);

    setHandouts((prev) =>
      prev.map((h) => (h.id === editing.id ? { ...h, title, content } : h))
    );
    setEditing(null);
    setSaving(false);
  }

  async function togglePublish(handout: Handout) {
    const supabase = createClient();
    const newPublished = handout.published_at ? null : new Date().toISOString();

    await supabase
      .from("handouts")
      .update({ published_at: newPublished })
      .eq("id", handout.id);

    setHandouts((prev) =>
      prev.map((h) =>
        h.id === handout.id ? { ...h, published_at: newPublished } : h
      )
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this handout?")) return;
    const supabase = createClient();
    await supabase.from("handouts").delete().eq("id", id);
    setHandouts((prev) => prev.filter((h) => h.id !== id));
  }

  function startEdit(handout: Handout) {
    setEditing(handout);
    setTitle(handout.title);
    setContent(handout.content);
    setCreating(false);
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Handouts</h1>
            <p className="mt-1 text-sm text-gray-400">
              Create and publish handouts for your players
            </p>
          </div>
          <button
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setTitle("");
              setContent("");
            }}
            className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-amber-500"
          >
            New Handout
          </button>
        </div>

        {/* Create/Edit form */}
        {(creating || editing) && (
          <div className="mb-6 rounded-lg bg-gray-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-200">
              {editing ? "Edit Handout" : "New Handout"}
            </h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Handout title"
              className="mb-3 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Markdown content..."
              rows={8}
              className="mb-3 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 font-mono text-sm focus:border-amber-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={editing ? handleUpdate : handleCreate}
                disabled={saving || !title.trim()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-gray-950 hover:bg-amber-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Handout list */}
        {handouts.length > 0 ? (
          <div className="space-y-3">
            {handouts.map((handout) => (
              <div
                key={handout.id}
                className="rounded-lg bg-gray-900 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-100">
                      {handout.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {handout.published_at ? (
                        <span className="text-green-400">Published</span>
                      ) : (
                        <span className="text-gray-500">Draft</span>
                      )}
                      {" · "}
                      {new Date(handout.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePublish(handout)}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        handout.published_at
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-green-900 text-green-300 hover:bg-green-800"
                      }`}
                    >
                      {handout.published_at ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => startEdit(handout)}
                      className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(handout.id)}
                      className="rounded bg-gray-800 px-3 py-1 text-xs text-red-400 hover:bg-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {handout.content && (
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {handout.content.slice(0, 150)}
                    {handout.content.length > 150 ? "..." : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : !creating ? (
          <div className="rounded-lg bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No handouts yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Create handouts to share with your players.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
