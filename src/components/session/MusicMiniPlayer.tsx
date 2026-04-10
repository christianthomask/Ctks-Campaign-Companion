"use client";

import { useMusic } from "./MusicPlayer";

export function MusicMiniPlayer() {
  const { currentTrack, isPlaying, volume, pause, resume, stop, setVolume } =
    useMusic();

  // Hide when nothing is playing and no track is loaded
  if (!currentTrack) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-gray-900 px-4 py-2 shadow-lg">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        {/* Music note icon */}
        <span
          className={`flex-shrink-0 text-amber-400 ${
            isPlaying ? "animate-pulse" : ""
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M17.721 1.599a.75.75 0 01.279.584v11.29a2.25 2.25 0 01-1.774 2.198l-2.041.442a2.216 2.216 0 01-.938-4.333l2.334-.506A.75.75 0 0016 10.545V6.103l-8 1.73v7.642a2.25 2.25 0 01-1.774 2.2l-2.042.44a2.216 2.216 0 11-.938-4.332l2.335-.506A.75.75 0 006 12.548V4.525a.75.75 0 01.596-.734l10-2.166a.75.75 0 01.845.305l.28.069z"
              clipRule="evenodd"
            />
          </svg>
        </span>

        {/* Track name */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200">
          {currentTrack.label}
        </span>

        {/* Play / Pause button */}
        <button
          onClick={isPlaying ? pause : resume}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100"
          aria-label={isPlaying ? "Pause" : "Resume"}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Stop button */}
        <button
          onClick={stop}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100"
          aria-label="Stop"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M4.5 3.5A1.5 1.5 0 003 5v10a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0017 15V5a1.5 1.5 0 00-1.5-1.5h-11z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Volume slider */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 flex-shrink-0 text-gray-500"
          >
            <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796a.75.75 0 001.264-.546V3.75zM15.95 6.05a.75.75 0 00-1.06 1.06 5.5 5.5 0 010 7.78.75.75 0 001.06 1.06 7 7 0 000-9.9z" />
          </svg>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-gray-700 accent-amber-400"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
