import { memo } from "react";

interface Props {
  text: string;
}

export const ReadAloud = memo(function ReadAloud({ text }: Props) {
  return (
    <blockquote className="my-4 rounded-r-lg border-l-4 border-amber-600 bg-amber-950/40 px-4 py-4">
      <p
        className="whitespace-pre-line text-lg leading-relaxed text-amber-100/90 italic"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {text}
      </p>
    </blockquote>
  );
});
