"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BackstoryStep({ draft, onUpdate, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-100">Backstory & Details</h2>
      <p className="mb-6 text-sm text-gray-400">Give your character a name and a story.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Character Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="What is your character called?"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-3 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Appearance</label>
          <textarea
            value={draft.appearance}
            onChange={(e) => onUpdate({ appearance: e.target.value })}
            rows={3}
            placeholder="What does your character look like?"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Backstory</label>
          <textarea
            value={draft.backstory}
            onChange={(e) => onUpdate({ backstory: e.target.value })}
            rows={4}
            placeholder="Where does your character come from? What drives them?"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
          <label className="block text-sm font-medium text-amber-400 mb-1">
            Book Donation <span className="text-red-400">*</span>
          </label>
          <p className="mb-2 text-xs text-gray-400">
            Every visitor to Candlekeep must donate a book to enter. What book is your character bringing, and why do they have it?
          </p>
          <textarea
            value={draft.book_donation}
            onChange={(e) => onUpdate({ book_donation: e.target.value })}
            rows={3}
            placeholder="A weathered journal of herbal remedies, inherited from my grandmother..."
            className="w-full rounded-lg border border-amber-900/50 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Motivation</label>
          <textarea
            value={draft.motivation}
            onChange={(e) => onUpdate({ motivation: e.target.value })}
            rows={2}
            placeholder="Why is your character at Candlekeep? What are they seeking?"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700">Back</button>
        <button onClick={onNext} disabled={!draft.name.trim() || !draft.book_donation.trim()} className="rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-gray-950 hover:bg-amber-500 disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}
