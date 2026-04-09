"use client";

import { useState, useEffect, useCallback } from "react";
import type { SessionContent } from "@/lib/types/session";
import { createClient } from "@/lib/supabase/client";

interface VersionRecord {
  id: string;
  version_number: number;
  uploaded_at: string;
  notes: string | null;
  content: SessionContent;
  raw_markdown: string;
}

interface Props {
  sessionId: string;
  currentVersion: number;
  onClose: () => void;
  onVersionSelect: (content: SessionContent) => void;
}

/**
 * Version history panel — slide-in side panel on desktop, bottom sheet on mobile.
 * Shows all saved versions of a session and allows restoring or downloading them.
 */
export function VersionHistory({
  sessionId,
  currentVersion,
  onClose,
  onVersionSelect,
}: Props) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Fetch versions on mount
  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("session_versions")
        .select("id, version_number, uploaded_at, notes, content, raw_markdown")
        .eq("session_id", sessionId)
        .order("version_number", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setVersions((data as VersionRecord[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch versions");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Format timestamp for display
  function formatDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Handle selecting a version to preview
  function handleVersionSelect(version: VersionRecord) {
    if (version.version_number === currentVersion) return;
    setSelectedVersion(version.version_number);
    onVersionSelect(version.content as SessionContent);
  }

  // Restore a previous version (creates a new version from old content)
  async function handleRestore(versionNumber: number) {
    setRestoringVersion(versionNumber);
    setError(null);

    try {
      const res = await fetch("/api/sessions/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          version_number: versionNumber,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Restore failed");
        return;
      }

      // Refresh the version list after restoring
      await fetchVersions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoringVersion(null);
    }
  }

  // Download raw markdown for a version
  function handleDownload(version: VersionRecord) {
    if (!version.raw_markdown) return;

    // Build a filename from the session title embedded in the content, or a fallback
    const title =
      version.content?.meta?.title?.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() ||
      "session";
    const filename = `${title}-v${version.version_number}.md`;

    const blob = new Blob([version.raw_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Handle "Back to current" — select the current version content
  function handleBackToCurrent() {
    const current = versions.find((v) => v.version_number === currentVersion);
    if (current) {
      onVersionSelect(current.content as SessionContent);
    }
    setSelectedVersion(null);
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — right side on desktop, bottom sheet on mobile */}
      <div
        className={
          "fixed z-50 flex flex-col bg-gray-900 " +
          // Mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[80vh] rounded-t-xl border-t border-gray-700 " +
          // Desktop: right side panel
          "md:inset-y-0 md:right-0 md:left-auto md:w-80 md:max-h-none md:rounded-none md:border-t-0 md:border-l md:border-gray-700"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">
            Version History
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            aria-label="Close version history"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* "Back to current" banner when viewing an old version */}
        {selectedVersion !== null && selectedVersion !== currentVersion && (
          <div className="border-b border-gray-700 bg-amber-900/30 px-4 py-2">
            <button
              onClick={handleBackToCurrent}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z"
                  clipRule="evenodd"
                />
              </svg>
              Back to current
            </button>
          </div>
        )}

        {/* Version list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-amber-400" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No version history available.
            </p>
          )}

          <div className="space-y-2">
            {versions.map((version) => {
              const isCurrent = version.version_number === currentVersion;
              const isSelected = version.version_number === selectedVersion;

              return (
                <div
                  key={version.id}
                  className={
                    "rounded-lg bg-gray-800 p-3 transition-colors " +
                    (isSelected
                      ? "ring-1 ring-amber-500"
                      : "hover:bg-gray-750")
                  }
                >
                  {/* Version header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100">
                        Version {version.version_number}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-amber-600 px-2 text-xs font-medium text-gray-950">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(version.uploaded_at)}
                  </p>

                  {/* Notes */}
                  {version.notes && (
                    <p className="mt-1 text-xs text-gray-400">
                      {version.notes}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="mt-2 flex items-center gap-2">
                    {/* View / select version */}
                    {!isCurrent && (
                      <button
                        onClick={() => handleVersionSelect(version)}
                        className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 transition-colors hover:bg-gray-600"
                      >
                        View
                      </button>
                    )}

                    {/* Restore button for non-current versions */}
                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(version.version_number)}
                        disabled={restoringVersion === version.version_number}
                        className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 transition-colors hover:bg-gray-600 disabled:opacity-50"
                      >
                        {restoringVersion === version.version_number
                          ? "Restoring..."
                          : "Restore this version"}
                      </button>
                    )}

                    {/* Download markdown */}
                    {version.raw_markdown && (
                      <button
                        onClick={() => handleDownload(version)}
                        className="px-1 py-1 text-xs text-amber-400 transition-colors hover:text-amber-300"
                      >
                        Download .md
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
