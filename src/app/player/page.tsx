import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PlayerDashboard() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-400">
          Campaign Companion
        </h1>
        <p className="text-gray-400 text-sm">Player Dashboard</p>

        <div className="space-y-3">
          <Link
            href="/player/reference"
            className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-amber-400/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-amber-400">
              Reference Sheets
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Quick-reference cheat sheets for combat, skills, conditions, and
              more.
            </p>
          </Link>

          <Link
            href="/player/character"
            className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-amber-400/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-amber-400">
              My Character
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              View your character sheet or create a new character.
            </p>
          </Link>

          <Link
            href="/player/handouts"
            className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-amber-400/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-amber-400">Handouts</h2>
            <p className="text-gray-400 text-sm mt-1">
              View handouts shared by your DM.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
