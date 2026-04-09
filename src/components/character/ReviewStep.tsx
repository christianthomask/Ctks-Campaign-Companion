"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onBack: () => void;
  onFinalize: () => void;
  onGoToStep: (step: number) => void;
  saving: boolean;
}

function modStr(score: number) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function ReviewStep({ draft, onBack, onFinalize, onGoToStep, saving }: Props) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-100">Review Your Character</h2>
      <p className="mb-6 text-sm text-gray-400">Review everything before finalizing.</p>

      <div className="space-y-4">
        {/* Identity */}
        <Section title="Identity" step={8} onEdit={onGoToStep}>
          <p className="text-lg font-semibold text-gray-100">{draft.name || "Unnamed"}</p>
          <p className="text-sm text-gray-400">
            {draft.race_name} {draft.class_name}
          </p>
        </Section>

        {/* Race */}
        <Section title="Race" step={2} onEdit={onGoToStep}>
          <p className="text-sm text-gray-200">{draft.race_name || "Not selected"}</p>
        </Section>

        {/* Class */}
        <Section title="Class" step={3} onEdit={onGoToStep}>
          <p className="text-sm text-gray-200">{draft.class_name || "Not selected"}</p>
          {draft.hit_die > 0 && <p className="text-xs text-gray-500">Hit Die: d{draft.hit_die}</p>}
        </Section>

        {/* Ability Scores */}
        <Section title="Ability Scores" step={4} onEdit={onGoToStep}>
          <div className="grid grid-cols-6 gap-2 text-center text-xs">
            {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ab) => {
              const score = draft[`${ab}_base` as keyof CharacterDraft] as number;
              return (
                <div key={ab}>
                  <div className="font-semibold uppercase text-gray-400">{ab}</div>
                  <div className="font-mono text-gray-100">{score}</div>
                  <div className="font-mono text-gray-500">({modStr(score)})</div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Background */}
        <Section title="Background" step={5} onEdit={onGoToStep}>
          <p className="text-sm text-gray-200">{draft.background_name || "Not selected"}</p>
        </Section>

        {/* Equipment */}
        <Section title="Equipment" step={6} onEdit={onGoToStep}>
          {draft.equipment.length > 0 ? (
            <ul className="text-sm text-gray-300 space-y-0.5">
              {draft.equipment.map((e) => (
                <li key={e.item_id}>{e.name}{e.quantity > 1 ? ` x${e.quantity}` : ""}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No equipment selected</p>
          )}
        </Section>

        {/* Spells */}
        {(draft.cantrips_known.length > 0 || draft.spells_known.length > 0) && (
          <Section title="Spells" step={7} onEdit={onGoToStep}>
            {draft.cantrips_known.length > 0 && (
              <p className="text-sm text-gray-300">Cantrips: {draft.cantrips_known.join(", ")}</p>
            )}
            {draft.spells_known.length > 0 && (
              <p className="text-sm text-gray-300">Spells: {draft.spells_known.join(", ")}</p>
            )}
          </Section>
        )}

        {/* Backstory */}
        <Section title="Backstory" step={8} onEdit={onGoToStep}>
          {draft.book_donation && (
            <p className="text-sm text-amber-300">Book: {draft.book_donation}</p>
          )}
          {draft.backstory && (
            <p className="text-sm text-gray-300 mt-1 line-clamp-3">{draft.backstory}</p>
          )}
        </Section>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700">Back</button>
        <button
          onClick={onFinalize}
          disabled={saving || !draft.name.trim()}
          className="rounded-lg bg-amber-600 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Finalize Character"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, step, onEdit, children }: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        <button onClick={() => onEdit(step)} className="text-xs text-amber-400 hover:text-amber-300">Edit</button>
      </div>
      {children}
    </div>
  );
}
