"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ReactMarkdown from "react-markdown";

interface Handout {
  id: string;
  title: string;
  content_type: string;
  content: string;
  category: string;
  published_at: string | null;
  storage_path: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  general: { label: "General", icon: "📄" },
  lore: { label: "Lore", icon: "📚" },
  letter: { label: "Letters", icon: "✉️" },
  map: { label: "Maps", icon: "🗺️" },
  rules: { label: "Rules", icon: "📋" },
};

export default function PlayerHandoutsPage() {
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const fetchHandouts = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get campaign membership
    const { data: memberships } = await supabase
      .from("campaign_members")
      .select("campaign_id")
      .eq("user_id", user.id);

    const campIds = memberships?.map((m) => m.campaign_id) || [];
    if (campIds.length > 0) setCampaignId(campIds[0]);

    if (campIds.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch published handouts
    const { data } = await supabase
      .from("handouts")
      .select("id, title, content_type, content, category, published_at, storage_path, created_at")
      .in("campaign_id", campIds)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

    if (data) setHandouts(data as Handout[]);

    // Fetch read status
    const { data: reads } = await supabase
      .from("handout_reads")
      .select("handout_id")
      .eq("user_id", user.id);

    if (reads) setReadIds(new Set(reads.map((r) => r.handout_id)));
    setLoading(false);
  }, []);

  // Mark handout as read
  async function markRead(handoutId: string) {
    if (readIds.has(handoutId)) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("handout_reads").upsert(
      { handout_id: handoutId, user_id: user.id },
      { onConflict: "handout_id,user_id" }
    );

    setReadIds((prev) => new Set([...prev, handoutId]));
  }

  // Toggle expanded and mark read
  function toggleExpand(id: string) {
    if (expanded !== id) {
      markRead(id);
    }
    setExpanded(expanded === id ? null : id);
  }

  // Initial fetch
  useEffect(() => {
    fetchHandouts();
  }, [fetchHandouts]);

  // Realtime subscription for live reveals
  useEffect(() => {
    if (!campaignId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("handout-reveals")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "handouts",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const oldRow = payload.old as Record<string, unknown>;
          if (newRow.published_at && !oldRow.published_at) {
            setToast(`New handout: ${newRow.title}`);
            setTimeout(() => setToast(null), 5000);
            fetchHandouts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchHandouts]);

  // Group by category
  const unread = handouts.filter((h) => !readIds.has(h.id));
  const read = handouts.filter((h) => readIds.has(h.id));

  // Group read handouts by category
  const readByCategory: Record<string, Handout[]> = {};
  for (const h of read) {
    const cat = h.category || "general";
    if (!readByCategory[cat]) readByCategory[cat] = [];
    readByCategory[cat].push(h);
  }

  if (loading) {
    return (
      <div className="animate-pulse px-4 py-6">
        <div className="h-8 w-32 rounded bg-gray-800 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Toast notification */}
        {toast && (
          <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-gray-950 shadow-lg">
            {toast}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Handouts</h1>
          <p className="mt-1 text-sm text-gray-400">From your DM</p>
        </div>

        {handouts.length === 0 ? (
          <div className="rounded-lg bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No handouts available yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Your DM will share handouts here during the campaign.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unread / NEW */}
            {unread.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">
                  New ({unread.length})
                </h2>
                <div className="space-y-3">
                  {unread.map((h) => (
                    <HandoutCard
                      key={h.id}
                      handout={h}
                      isNew
                      expanded={expanded === h.id}
                      onToggle={() => toggleExpand(h.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Read, grouped by category */}
            {Object.entries(readByCategory).map(([cat, items]) => (
              <div key={cat}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {CATEGORY_LABELS[cat]?.icon || "📄"} {CATEGORY_LABELS[cat]?.label || cat} ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((h) => (
                    <HandoutCard
                      key={h.id}
                      handout={h}
                      expanded={expanded === h.id}
                      onToggle={() => toggleExpand(h.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HandoutCard({
  handout,
  isNew,
  expanded,
  onToggle,
}: {
  handout: Handout;
  isNew?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-lg border ${
        isNew ? "border-amber-700/50 bg-amber-950/10" : "border-gray-800 bg-gray-900"
      } overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="rounded bg-red-900 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-300">
                New
              </span>
            )}
            <h3 className="font-semibold text-gray-100">{handout.title}</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {handout.published_at
              ? new Date(handout.published_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : ""}
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-4">
          {handout.content_type === "image" && handout.storage_path ? (
            <img
              src={handout.storage_path}
              alt={handout.title}
              className="max-w-full rounded-lg"
            />
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-a:text-amber-400 prose-strong:text-gray-200 prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded prose-blockquote:border-amber-600 prose-blockquote:bg-amber-950/20 prose-blockquote:py-1">
              <ReactMarkdown>{handout.content}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
