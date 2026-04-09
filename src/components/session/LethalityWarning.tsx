import { memo } from "react";

interface Props {
  content: string;
}

export const LethalityWarning = memo(function LethalityWarning({ content }: Props) {
  return (
    <div className="my-4 rounded-r-lg border-l-4 border-red-500 bg-red-950/40 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span>&#x26A0;&#xFE0F;</span>
        <span className="text-sm font-bold uppercase tracking-wide text-red-300">
          Lethality Check
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
        {content}
      </p>
    </div>
  );
});
