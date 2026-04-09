"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
}

function modStr(score: number) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function CharacterPreview({ draft }: Props) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Character Preview
      </h2>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-amber-400">
          {draft.name || "Unnamed Hero"}
        </h3>
        <p className="text-sm text-gray-400">
          {[draft.race_name, draft.class_name].filter(Boolean).join(" ") || "No race or class selected"}
        </p>
        {draft.background_name && (
          <p className="text-xs text-gray-500">{draft.background_name}</p>
        )}
      </div>

      {/* Ability scores mini grid */}
      <div className="mb-4 grid grid-cols-3 gap-1 text-center text-xs">
        {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ab) => {
          const score = draft[`${ab}_base` as keyof CharacterDraft] as number;
          return (
            <div key={ab} className="rounded bg-gray-800 p-1.5">
              <div className="font-semibold uppercase text-gray-500">{ab}</div>
              <div className="font-mono text-gray-200">{score}</div>
              <div className="font-mono text-xs text-gray-500">({modStr(score)})</div>
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      {draft.class_id && (
        <div className="mb-4 flex gap-2 text-xs">
          <span className="rounded bg-gray-800 px-2 py-1 text-gray-400">
            HP: <span className="font-mono text-gray-200">{draft.hit_die + Math.floor((draft.con_base - 10) / 2)}</span>
          </span>
          <span className="rounded bg-gray-800 px-2 py-1 text-gray-400">
            Hit Die: <span className="font-mono text-gray-200">d{draft.hit_die}</span>
          </span>
        </div>
      )}

      {/* Skills */}
      {draft.skill_proficiencies.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1 text-xs font-semibold text-gray-500">Skills</h4>
          <div className="flex flex-wrap gap-1">
            {draft.skill_proficiencies.map((s) => (
              <span key={s} className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-amber-400/70">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Equipment count */}
      {draft.equipment.length > 0 && (
        <p className="text-xs text-gray-500">
          {draft.equipment.length} items equipped
        </p>
      )}
    </div>
  );
}
