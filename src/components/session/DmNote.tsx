"use client";

import { memo, useState } from "react";
import type { DmNote as DmNoteType } from "@/lib/types/session";

const NOTE_STYLES = {
  tip: {
    border: "border-blue-500",
    bg: "bg-blue-950/40",
    title: "text-blue-300",
    icon: "💡",
  },
  warning: {
    border: "border-red-500",
    bg: "bg-red-950/40",
    title: "text-red-300",
    icon: "⚠️",
  },
  lore: {
    border: "border-purple-500",
    bg: "bg-purple-950/40",
    title: "text-purple-300",
    icon: "📜",
  },
  rp_guidance: {
    border: "border-green-500",
    bg: "bg-green-950/40",
    title: "text-green-300",
    icon: "🎭",
  },
} as const;

interface Props {
  note: DmNoteType;
}

export const DmNoteBlock = memo(function DmNoteBlock({ note }: Props) {
  const [expanded, setExpanded] = useState(true);
  const style = NOTE_STYLES[note.type];

  return (
    <div
      className={`my-3 rounded-r-lg border-l-4 ${style.border} ${style.bg} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm">{style.icon}</span>
        <span className={`flex-1 text-sm font-semibold ${style.title}`}>
          {note.title || note.type.replace("_", " ").toUpperCase()}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-sm leading-relaxed text-gray-300 whitespace-pre-line">
          {note.content}
        </div>
      )}
    </div>
  );
});
