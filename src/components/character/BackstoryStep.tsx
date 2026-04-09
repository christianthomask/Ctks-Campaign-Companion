"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BackstoryStep({ draft, onUpdate, onNext, onBack }: Props) {
  const canContinue = draft.name.trim().length > 0 && draft.book_donation.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">
          Backstory &amp; Details
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Give your character a name, a story, and a reason to be at Candlekeep.
        </p>
      </div>

      {/* Name (required) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300">
          Character Name{" "}
          <span className="text-red-400" aria-label="required">
            *
          </span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="What is your character called?"
          className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-base text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {!draft.name.trim() && (
          <p className="mt-1 text-xs text-gray-600">
            A name is required to finalize your character.
          </p>
        )}
      </div>

      {/* Appearance */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300">
          Appearance
        </label>
        <textarea
          value={draft.appearance}
          onChange={(e) => onUpdate({ appearance: e.target.value })}
          placeholder="What does your character look like? Height, build, distinguishing features, clothing..."
          rows={3}
          className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Backstory */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300">
          Backstory
        </label>
        <textarea
          value={draft.backstory}
          onChange={(e) => onUpdate({ backstory: e.target.value })}
          placeholder="Where does your character come from? What shaped them? What have they experienced?"
          rows={5}
          className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Book Donation (required, Candlekeep-specific) */}
      <div className="rounded-xl border border-amber-600/30 bg-amber-950/20 p-4">
        <label className="mb-1 block text-sm font-medium text-amber-400">
          Book Donation{" "}
          <span className="text-red-400" aria-label="required">
            *
          </span>
        </label>
        <p className="mb-2 text-xs text-gray-400">
          Every visitor to Candlekeep must donate a written work not already in
          the library&rsquo;s collection. What book, scroll, or manuscript is your
          character bringing? Why do they have it?
        </p>
        <textarea
          value={draft.book_donation}
          onChange={(e) => onUpdate({ book_donation: e.target.value })}
          placeholder="A weathered journal of herbal remedies, inherited from my grandmother who was a village healer..."
          rows={3}
          className="min-h-[44px] w-full rounded-lg border border-amber-900/50 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {!draft.book_donation.trim() && (
          <p className="mt-1 text-xs text-amber-600/70">
            A book donation is required to enter Candlekeep.
          </p>
        )}
      </div>

      {/* Motivation */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300">
          Motivation
        </label>
        <textarea
          value={draft.motivation}
          onChange={(e) => onUpdate({ motivation: e.target.value })}
          placeholder="Why is your character traveling to Candlekeep? What knowledge do they seek?"
          rows={3}
          className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
