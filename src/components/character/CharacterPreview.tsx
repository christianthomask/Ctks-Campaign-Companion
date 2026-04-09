"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

export function CharacterPreview({ draft }: Props) {
  const hp =
    draft.class_id
      ? draft.hit_die + Math.floor((draft.con_base - 10) / 2)
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
          Character Preview
        </h2>
        <h3 className="text-lg font-bold text-amber-400">
          {draft.name || "Unnamed"}
        </h3>
        <p className="text-sm text-gray-400">
          {[draft.race_name, draft.class_name].filter(Boolean).join(" ") ||
            "No race or class yet"}
        </p>
        {draft.background_name && (
          <p className="text-xs text-gray-500">{draft.background_name}</p>
        )}
      </div>

      {/* Quick stats */}
      {(hp !== null || draft.hit_die > 0) && (
        <div className="flex gap-2">
          {hp !== null && (
            <div className="rounded-lg bg-gray-800 px-3 py-1.5 text-center">
              <div className="text-[10px] font-semibold uppercase text-gray-500">
                HP
              </div>
              <div className="text-sm font-bold text-gray-100">{hp}</div>
            </div>
          )}
          {draft.hit_die > 0 && draft.class_id && (
            <div className="rounded-lg bg-gray-800 px-3 py-1.5 text-center">
              <div className="text-[10px] font-semibold uppercase text-gray-500">
                Hit Die
              </div>
              <div className="text-sm font-bold text-gray-100">
                d{draft.hit_die}
              </div>
            </div>
          )}
          <div className="rounded-lg bg-gray-800 px-3 py-1.5 text-center">
            <div className="text-[10px] font-semibold uppercase text-gray-500">
              Level
            </div>
            <div className="text-sm font-bold text-gray-100">1</div>
          </div>
        </div>
      )}

      {/* Ability scores compact grid */}
      <div>
        <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
          Ability Scores
        </h4>
        <div className="grid grid-cols-3 gap-1">
          {ABILITY_KEYS.map((ab) => {
            const key = `${ab}_base` as keyof CharacterDraft;
            const score = draft[key] as number;
            return (
              <div
                key={ab}
                className="rounded bg-gray-800 px-2 py-1.5 text-center"
              >
                <div className="text-[10px] font-semibold uppercase text-gray-500">
                  {ab}
                </div>
                <div className="text-sm font-bold text-gray-200">{score}</div>
                <div className="text-[10px] text-gray-500">
                  {getModifier(score)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill proficiencies */}
      {draft.skill_proficiencies.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Skills
          </h4>
          <div className="flex flex-wrap gap-1">
            {draft.skill_proficiencies.map((skill) => (
              <span
                key={skill}
                className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-amber-400/70"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Equipment count */}
      {draft.equipment.length > 0 && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Equipment
          </h4>
          <p className="text-xs text-gray-500">
            {draft.equipment.length} item
            {draft.equipment.length !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}

      {/* Spells */}
      {(draft.cantrips_known.length > 0 || draft.spells_known.length > 0) && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Spells
          </h4>
          {draft.cantrips_known.length > 0 && (
            <p className="text-xs text-gray-500">
              {draft.cantrips_known.length} cantrip
              {draft.cantrips_known.length !== 1 ? "s" : ""}
            </p>
          )}
          {draft.spells_known.length > 0 && (
            <p className="text-xs text-gray-500">
              {draft.spells_known.length} spell
              {draft.spells_known.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Book donation preview */}
      {draft.book_donation && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Book Donation
          </h4>
          <p className="text-xs italic text-amber-400/60 line-clamp-2">
            {draft.book_donation}
          </p>
        </div>
      )}
    </div>
  );
}
