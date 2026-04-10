import { memo } from "react";
import type { Section, PuzzleEntry } from "@/lib/types/session";
import { ReadAloud } from "./ReadAloud";
import { DmNoteBlock } from "./DmNote";
import { StatBlockCard } from "./StatBlock";
import { LethalityWarning } from "./LethalityWarning";
import { PuzzleTracker } from "./PuzzleTracker";
import { MusicCueButton } from "./MusicCueButton";

interface Props {
  section: Section;
  puzzleEntries: PuzzleEntry[];
  onTogglePuzzle: (letter: string) => void;
}

export const RoomBlock = memo(function RoomBlock({
  section,
  puzzleEntries,
  onTogglePuzzle,
}: Props) {
  return (
    <div id={section.id} className="py-6">
      {/* Section title */}
      <h3 className="mb-1 text-base font-bold text-gray-100">{section.title}</h3>

      {/* Tags */}
      {section.tags && section.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {section.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded px-1.5 py-0.5 text-xs ${
                tag.includes("danger") || tag.includes("combat")
                  ? "bg-red-900/50 text-red-300"
                  : tag.includes("puzzle") || tag.includes("key")
                  ? "bg-amber-900/50 text-amber-300"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Music cues */}
      {section.music_cues && section.music_cues.length > 0 && (
        <div className="mb-3">
          {section.music_cues.map((cue, i) => (
            <MusicCueButton key={`${cue.label}-${i}`} cue={cue} />
          ))}
        </div>
      )}

      {/* Lethality warning */}
      {section.lethality_warning && (
        <LethalityWarning content={section.lethality_warning} />
      )}

      {/* Read-aloud text */}
      {section.read_aloud && <ReadAloud text={section.read_aloud} />}

      {/* Description */}
      <p className="my-3 text-sm leading-relaxed text-gray-300 whitespace-pre-line">
        {section.description}
      </p>

      {/* DM notes */}
      {section.dm_notes?.map((note, i) => (
        <DmNoteBlock key={`${note.type}-${i}`} note={note} />
      ))}

      {/* Threats / stat blocks */}
      {section.threats?.map((threat) => (
        <StatBlockCard key={threat.name} threat={threat} />
      ))}

      {/* Interactions table */}
      {section.interactions && section.interactions.length > 0 && (
        <div className="my-4 overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-3 py-2 text-left font-medium text-gray-400">
                  Action
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-400">
                  Check
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-400">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {section.interactions.map((interaction, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-gray-200">
                    {interaction.action}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-amber-400">
                    {interaction.check || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {interaction.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Treasure */}
      {section.treasure && section.treasure.length > 0 && (
        <div className="my-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400/70">
            Treasure
          </h4>
          <ul className="space-y-1">
            {section.treasure.map((item, i) => (
              <li key={i} className="text-sm text-gray-300">
                <span className="text-gray-100">{item.item}</span>
                {item.value && (
                  <span className="text-gray-500"> — {item.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Puzzle book */}
      {section.puzzle_book && (
        <div className="my-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
          <h4 className="mb-1 text-sm font-semibold text-amber-400">
            Puzzle Book — Letter &ldquo;{section.puzzle_book.letter}&rdquo;
          </h4>
          <p className="text-sm text-gray-300">
            {section.puzzle_book.location_description}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            <span className="font-medium text-gray-300">Discovery: </span>
            {section.puzzle_book.discovery}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            <span className="font-medium text-gray-300">Illustration: </span>
            {section.puzzle_book.illustration}
          </p>
        </div>
      )}

      {/* Connections */}
      {section.connections && section.connections.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Connects to:</span>
          {section.connections.map((connId) => (
            <button
              key={connId}
              onClick={() => {
                const el = document.getElementById(connId);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="text-xs text-amber-400/70 hover:text-amber-400 underline"
            >
              {connId}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
