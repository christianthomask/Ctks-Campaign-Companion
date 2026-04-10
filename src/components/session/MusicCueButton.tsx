"use client";

import type { MusicCue } from "@/lib/types/session";
import { useMusic } from "./MusicPlayer";

interface Props {
  cue: MusicCue;
}

export function MusicCueButton({ cue }: Props) {
  const { currentTrack, isPlaying, playTrack, pause, resume, apiReady } =
    useMusic();

  const isThisCue =
    currentTrack?.label === cue.label &&
    currentTrack?.videoIds.join(",") === cue.videoIds.join(",");
  const isThisPlaying = isThisCue && isPlaying;

  function handleClick() {
    if (!apiReady) return;
    if (isThisPlaying) {
      pause();
    } else if (isThisCue) {
      resume();
    } else {
      playTrack(cue);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!apiReady}
      className={`my-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        isThisPlaying
          ? "border-amber-500 bg-amber-950/30"
          : "border-amber-700/50 bg-amber-950/10 hover:border-amber-600/70 hover:bg-amber-950/20"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {/* Music note icon */}
      <span
        className={`flex-shrink-0 text-amber-400 ${
          isThisPlaying ? "animate-pulse" : ""
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

      {/* Label */}
      <span className="flex-1 truncate font-medium text-gray-200">
        {cue.label}
      </span>

      {/* Play/pause indicator */}
      <span className="flex-shrink-0 text-amber-400">
        {isThisPlaying ? (
          // Pause icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
          </svg>
        ) : (
          // Play icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </span>
    </button>
  );
}
