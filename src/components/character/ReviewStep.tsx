"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onBack: () => void;
  onFinalize: () => void;
  onGoToStep: (step: number) => void;
  saving: boolean;
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h3>
        <button
          onClick={() => onEdit(step)}
          className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-gray-800 hover:text-amber-300"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

export function ReviewStep({
  draft,
  onBack,
  onFinalize,
  onGoToStep,
  saving,
}: Props) {
  const hp = draft.hit_die + Math.floor((draft.con_base - 10) / 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">
          Review Your Character
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Check everything looks right, then finalize your character.
        </p>
      </div>

      <div className="space-y-4">
        {/* Identity */}
        <Section title="Identity" step={8} onEdit={onGoToStep}>
          <p className="text-xl font-bold text-gray-100">
            {draft.name || "Unnamed Hero"}
          </p>
          <p className="mt-1 text-sm text-gray-300">
            {[draft.race_name, draft.class_name].filter(Boolean).join(" ") ||
              "No race or class selected"}
          </p>
          {draft.background_name && (
            <p className="text-sm text-gray-500">{draft.background_name}</p>
          )}
          {draft.appearance && (
            <p className="mt-2 text-sm italic text-gray-400">
              {draft.appearance}
            </p>
          )}
        </Section>

        {/* Race */}
        <Section title="Race" step={2} onEdit={onGoToStep}>
          <p className="text-sm text-gray-200">
            {draft.race_name || (
              <span className="text-gray-600">Not selected</span>
            )}
          </p>
        </Section>

        {/* Class */}
        <Section title="Class" step={3} onEdit={onGoToStep}>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-200">
              {draft.class_name || (
                <span className="text-gray-600">Not selected</span>
              )}
            </p>
            {draft.hit_die > 0 && (
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                d{draft.hit_die}
              </span>
            )}
            {draft.class_id && (
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                HP {hp}
              </span>
            )}
          </div>
          {draft.skill_proficiencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {draft.skill_proficiencies.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-gray-800 px-2 py-0.5 text-xs text-amber-400/70"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* Ability Scores */}
        <Section title="Ability Scores" step={4} onEdit={onGoToStep}>
          <div className="grid grid-cols-6 gap-2 text-center">
            {(["str", "dex", "con", "int", "wis", "cha"] as const).map(
              (ab) => {
                const key = `${ab}_base` as keyof CharacterDraft;
                const score = draft[key] as number;
                return (
                  <div
                    key={ab}
                    className="rounded-lg bg-gray-800 px-1 py-2"
                  >
                    <div className="text-[10px] font-semibold uppercase text-gray-500">
                      {ab}
                    </div>
                    <div className="text-lg font-bold text-gray-100">
                      {score}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getModifier(score)}
                    </div>
                  </div>
                );
              }
            )}
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Method: {draft.ability_score_method.replace("_", " ")}
          </p>
        </Section>

        {/* Background */}
        <Section title="Background" step={5} onEdit={onGoToStep}>
          <p className="text-sm text-gray-200">
            {draft.background_name || (
              <span className="text-gray-600">Not selected</span>
            )}
          </p>
          {draft.personality_traits && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-500">
                Personality:{" "}
              </span>
              <span className="text-xs text-gray-400">
                {draft.personality_traits}
              </span>
            </div>
          )}
          {draft.ideals && (
            <div className="mt-1">
              <span className="text-xs font-medium text-gray-500">
                Ideals:{" "}
              </span>
              <span className="text-xs text-gray-400">{draft.ideals}</span>
            </div>
          )}
          {draft.bonds && (
            <div className="mt-1">
              <span className="text-xs font-medium text-gray-500">
                Bonds:{" "}
              </span>
              <span className="text-xs text-gray-400">{draft.bonds}</span>
            </div>
          )}
          {draft.flaws && (
            <div className="mt-1">
              <span className="text-xs font-medium text-gray-500">
                Flaws:{" "}
              </span>
              <span className="text-xs text-gray-400">{draft.flaws}</span>
            </div>
          )}
        </Section>

        {/* Equipment */}
        <Section title="Equipment" step={6} onEdit={onGoToStep}>
          {draft.equipment.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {draft.equipment.map((e) => (
                <span
                  key={e.item_id}
                  className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300"
                >
                  {e.name}
                  {e.quantity > 1 ? ` x${e.quantity}` : ""}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No equipment selected</p>
          )}
        </Section>

        {/* Spells */}
        {(draft.cantrips_known.length > 0 ||
          draft.spells_known.length > 0) && (
          <Section title="Spells" step={7} onEdit={onGoToStep}>
            {draft.cantrips_known.length > 0 && (
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500">
                  Cantrips:{" "}
                </span>
                <span className="text-xs text-gray-300">
                  {draft.cantrips_known.join(", ")}
                </span>
              </div>
            )}
            {draft.spells_known.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500">
                  Level 1:{" "}
                </span>
                <span className="text-xs text-gray-300">
                  {draft.spells_known.join(", ")}
                </span>
              </div>
            )}
          </Section>
        )}

        {/* Backstory & Book */}
        <Section title="Backstory" step={8} onEdit={onGoToStep}>
          {draft.book_donation && (
            <div className="mb-2 rounded-lg border border-amber-600/20 bg-amber-950/10 p-2">
              <span className="text-xs font-medium text-amber-400">
                Book Donation:{" "}
              </span>
              <span className="text-xs text-amber-100/70">
                {draft.book_donation}
              </span>
            </div>
          )}
          {draft.backstory && (
            <p className="text-sm leading-relaxed text-gray-400">
              {draft.backstory}
            </p>
          )}
          {draft.motivation && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-500">
                Motivation:{" "}
              </span>
              <span className="text-xs text-gray-400">{draft.motivation}</span>
            </div>
          )}
        </Section>
      </div>

      {/* Warnings */}
      {(!draft.name.trim() || !draft.book_donation.trim()) && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
          <p className="text-sm text-red-400">
            {!draft.name.trim() && "A character name is required. "}
            {!draft.book_donation.trim() && "A book donation is required to enter Candlekeep."}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={onFinalize}
          disabled={saving || !draft.name.trim()}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            "Finalize Character"
          )}
        </button>
      </div>
    </div>
  );
}
