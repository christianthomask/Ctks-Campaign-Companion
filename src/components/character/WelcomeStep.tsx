"use client";

interface Props {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-amber-400">
          Welcome to Candlekeep
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          A Campaign Companion Character Creator
        </p>
      </div>

      {/* Lore card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <p className="leading-relaxed text-gray-200">
          On the rocky promontory overlooking the Sea of Swords stands{" "}
          <span className="font-semibold text-amber-400">Candlekeep</span>, the
          greatest library-fortress in all of Faer&ucirc;n. Behind its towering
          walls lie vaults containing every written work ever collected — scrolls,
          tomes, and codices spanning millennia of knowledge.
        </p>

        <p className="leading-relaxed text-gray-200">
          Candlekeep sits on the Sword Coast, south of Baldur&rsquo;s Gate,
          perched atop cliffs that plunge into the churning sea below. The
          fortress is guarded by the{" "}
          <span className="font-semibold text-amber-400">Avowed</span>, an order
          of monks and scholars dedicated to preserving knowledge. Within its
          walls, sages study ancient lore, mages conduct arcane research, and
          seekers come from across the Realms in search of answers.
        </p>

        <div className="rounded-lg border border-amber-600/30 bg-amber-950/30 p-4">
          <h3 className="mb-2 font-semibold text-amber-300">
            The Price of Admission
          </h3>
          <p className="text-sm leading-relaxed text-amber-100/80">
            To gain entry to Candlekeep, every visitor must donate a written work
            not already contained within the library&rsquo;s collection. This can be a
            book, a scroll, a map, or any written work of significance. Your
            character will need to bring such a gift — think about what kind of
            book or writing your character would carry.
          </p>
        </div>

        <p className="leading-relaxed text-gray-200">
          Your adventure begins as you arrive at Candlekeep&rsquo;s gates, donation in
          hand, ready to step into the mysteries that lie within. But first,
          let&rsquo;s create your character.
        </p>
      </div>

      {/* What to expect */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-3 font-semibold text-gray-100">
          What to Expect
        </h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">1.</span>
            <span>Choose a character concept and archetype</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">2.</span>
            <span>Pick your race and class</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">3.</span>
            <span>Set ability scores and choose a background</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">4.</span>
            <span>Select equipment and spells (if applicable)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">5.</span>
            <span>Write your backstory and name your character</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">6.</span>
            <span>Review and finalize</span>
          </li>
        </ul>
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onNext}
          className="min-h-[44px] rounded-lg bg-amber-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-amber-500 active:bg-amber-700"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
