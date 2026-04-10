"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { SessionContent } from "@/lib/types/session";
import { RoomBlock } from "./RoomBlock";
import { SearchOverlay } from "./SearchOverlay";
import { QuickReference } from "./QuickReference";
import { VersionHistory } from "./VersionHistory";
import { MusicProvider, useMusic } from "./MusicPlayer";
import { MusicMiniPlayer } from "./MusicMiniPlayer";
import { useSessionState } from "@/hooks/useSessionState";

interface Props {
  sessionId: string;
  content: SessionContent;
  title: string;
  subtitle: string | null;
  currentVersion?: number;
}

export function SessionViewer(props: Props) {
  return (
    <MusicProvider>
      <SessionViewerInner {...props} />
    </MusicProvider>
  );
}

/** Inner component that can access MusicContext */
function SessionViewerInner({ sessionId, content, title, subtitle, currentVersion = 1 }: Props) {
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showMobileToc, setShowMobileToc] = useState(false);
  const [viewingContent, setViewingContent] = useState<SessionContent | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const { puzzleEntries, togglePuzzle } = useSessionState(sessionId);
  const { setAllCues } = useMusic();

  // The content to actually render — either an old version preview or the live content
  const activeContent = viewingContent ?? content;

  // Collect all music cues from all sections
  const allMusicCues = useMemo(
    () =>
      activeContent.acts.flatMap((a) =>
        a.sections.flatMap((s) => s.music_cues || [])
      ),
    [activeContent.acts]
  );

  // Sync music cues with the MusicContext
  useEffect(() => {
    setAllCues(allMusicCues);
  }, [allMusicCues, setAllCues]);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowQuickRef(false);
        setShowHistory(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Back to top visibility
  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Build table of contents
  const toc = useMemo(() => {
    return activeContent.acts.map((act) => ({
      id: act.id,
      title: act.title,
      sections: act.sections.map((s) => ({ id: s.id, title: s.title })),
    }));
  }, [activeContent.acts]);

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowSearch(false);
    }
  }

  return (
    <div className="relative min-h-screen" ref={mainRef}>
      {/* Fixed top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm">
        <button
          className="min-w-0 flex-1 text-left md:cursor-default"
          onClick={() => setShowMobileToc(true)}
          title="Tap for table of contents"
        >
          <h1 className="truncate text-lg font-bold text-amber-400">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-gray-400">
              {subtitle}
              <span className="ml-1 text-gray-600 md:hidden">&#x25BC;</span>
            </p>
          )}
        </button>
        <div className="flex items-center gap-2 pl-3">
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setShowQuickRef(!showQuickRef)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              showQuickRef
                ? "bg-amber-600 text-gray-950"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
            aria-label="Quick reference"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1h.01a1 1 0 010 2h-.01a1 1 0 01-1-1zm0 5.25a1 1 0 011-1h.01a1 1 0 010 2h-.01a1 1 0 01-1-1zm0 5.25a1 1 0 011-1h.01a1 1 0 010 2h-.01a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              showHistory
                ? "bg-amber-600 text-gray-950"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
            aria-label="Version history"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Old version banner */}
      {viewingContent && (
        <div className="sticky top-[57px] z-25 flex items-center justify-between border-b border-amber-700/50 bg-amber-900/30 px-4 py-2 backdrop-blur-sm">
          <p className="text-sm font-medium text-amber-400">
            Viewing an older version — not the current version
          </p>
          <button
            onClick={() => setViewingContent(null)}
            className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-600"
          >
            Back to current
          </button>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar TOC */}
        <nav className="hidden w-64 shrink-0 border-r border-gray-800 bg-gray-950 md:block">
          <div className="sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Contents
            </h2>
            {toc.map((act) => (
              <div key={act.id} className="mb-4">
                <button
                  onClick={() => scrollToSection(act.id)}
                  className="mb-1 text-left text-sm font-semibold text-amber-400/80 hover:text-amber-400"
                >
                  {act.title}
                </button>
                <div className="space-y-0.5 pl-2">
                  {act.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="block w-full truncate text-left text-xs text-gray-400 hover:text-gray-200"
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Session meta */}
          <div className="border-b border-gray-800 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                <span className="rounded bg-gray-800 px-2 py-1">
                  Level {activeContent.meta.level}
                </span>
                <span className="rounded bg-gray-800 px-2 py-1">
                  {activeContent.meta.party_size}
                </span>
                <span className="rounded bg-gray-800 px-2 py-1">
                  {activeContent.meta.estimated_duration}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-300">{activeContent.meta.tone}</p>
              <p className="mt-1 text-sm font-medium text-red-400">
                {activeContent.meta.lethality}
              </p>
            </div>
          </div>

          {/* Acts and sections */}
          {activeContent.acts.map((act) => (
            <div key={act.id} id={act.id}>
              {/* Sticky act header */}
              <div className="sticky top-[57px] z-20 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm sm:px-6">
                <div className="mx-auto max-w-3xl flex items-baseline justify-between">
                  <h2 className="text-lg font-bold text-amber-400">{act.title}</h2>
                  <span className="text-xs text-gray-500">{act.target_time}</span>
                </div>
              </div>

              <div className="px-4 sm:px-6">
                <div className="mx-auto max-w-3xl divide-y divide-gray-800/50">
                  {act.sections.map((section) => (
                    <RoomBlock
                      key={section.id}
                      section={section}
                      puzzleEntries={puzzleEntries}
                      onTogglePuzzle={togglePuzzle}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Appendices */}
          {activeContent.appendices && activeContent.appendices.length > 0 && (
            <div id="appendices">
              <div className="sticky top-[57px] z-20 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm sm:px-6">
                <div className="mx-auto max-w-3xl">
                  <h2 className="text-lg font-bold text-amber-400">Appendices</h2>
                </div>
              </div>
              <div className="px-4 sm:px-6">
                <div className="mx-auto max-w-3xl divide-y divide-gray-800/50">
                  {activeContent.appendices.map((appendix) => (
                    <div key={appendix.id} id={appendix.id} className="py-6">
                      <h3 className="mb-4 text-base font-semibold text-gray-100">
                        {appendix.title}
                      </h3>
                      {"roll" in (appendix.content[0] || {}) ? (
                        // Whimsy table
                        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700">
                                <th className="px-3 py-2 text-left font-medium text-gray-400 w-16">d10</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-400">Event</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                              {(appendix.content as Array<{ roll: number; description: string }>).map((entry) => (
                                <tr key={entry.roll}>
                                  <td className="px-3 py-2 font-mono text-amber-400">{entry.roll}</td>
                                  <td className="px-3 py-2 text-gray-300">{entry.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        // Lore threads
                        <div className="space-y-3">
                          {(appendix.content as Array<{ thread: string; clue: string; future: string }>).map((entry) => (
                            <div
                              key={entry.thread}
                              className="rounded-lg border border-purple-900/50 bg-purple-950/20 p-3"
                            >
                              <h4 className="font-medium text-purple-300">{entry.thread}</h4>
                              <p className="mt-1 text-sm text-gray-400">
                                <span className="font-medium text-gray-300">Clue: </span>
                                {entry.clue}
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                <span className="font-medium text-gray-300">Future: </span>
                                {entry.future}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Music mini player */}
      <MusicMiniPlayer />

      {/* Back to top FAB — shifted up when mini player is visible */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-300 shadow-lg transition-colors hover:bg-gray-700 md:bottom-6"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Search overlay */}
      {showSearch && (
        <SearchOverlay
          content={activeContent}
          onClose={() => setShowSearch(false)}
          onNavigate={scrollToSection}
        />
      )}

      {/* Quick reference */}
      {showQuickRef && (
        <QuickReference
          quickRef={activeContent.quick_reference}
          puzzleEntries={puzzleEntries}
          onTogglePuzzle={togglePuzzle}
          onClose={() => setShowQuickRef(false)}
          musicCues={allMusicCues}
        />
      )}

      {/* Mobile TOC drawer */}
      {showMobileToc && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowMobileToc(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-gray-700 bg-gray-900 p-4 md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-amber-400">Table of Contents</h2>
              <button onClick={() => setShowMobileToc(false)} className="text-gray-400 hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            {toc.map((act) => (
              <div key={act.id} className="mb-3">
                <button
                  onClick={() => { scrollToSection(act.id); setShowMobileToc(false); }}
                  className="mb-1 text-left text-sm font-semibold text-amber-400/80 hover:text-amber-400"
                >
                  {act.title}
                </button>
                <div className="space-y-0.5 pl-3 border-l border-gray-800">
                  {act.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => { scrollToSection(section.id); setShowMobileToc(false); }}
                      className="block w-full truncate text-left text-xs text-gray-400 py-1.5 hover:text-gray-200"
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Version history panel */}
      {showHistory && (
        <VersionHistory
          sessionId={sessionId}
          currentVersion={currentVersion}
          onClose={() => setShowHistory(false)}
          onVersionSelect={(versionContent) => {
            setViewingContent(versionContent);
          }}
        />
      )}
    </div>
  );
}
