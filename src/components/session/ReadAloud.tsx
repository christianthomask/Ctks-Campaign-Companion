"use client";

import { memo, useState } from "react";

interface Props {
  text: string;
}

export const ReadAloud = memo(function ReadAloud({ text }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <blockquote
        onClick={() => setFullscreen(true)}
        className="my-4 cursor-pointer rounded-r-lg border-l-4 border-amber-600 bg-amber-950/40 px-4 py-4 transition-colors hover:bg-amber-950/50"
        title="Tap to enter fullscreen reading mode"
      >
        <p
          className="whitespace-pre-line text-lg leading-relaxed text-amber-100/90 italic"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {text}
        </p>
        <p className="mt-2 text-right text-xs text-amber-600/50">Tap to expand</p>
      </blockquote>

      {/* Fullscreen reading mode */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950 p-6"
          onClick={() => setFullscreen(false)}
        >
          <div className="max-h-full max-w-2xl overflow-y-auto">
            <p
              className="whitespace-pre-line text-xl leading-[1.8] text-amber-100/90 italic text-center"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {text}
            </p>
            <p className="mt-8 text-center text-xs text-gray-600">
              Tap anywhere to dismiss
            </p>
          </div>
        </div>
      )}
    </>
  );
});
