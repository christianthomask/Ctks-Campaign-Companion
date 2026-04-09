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
          {/* Cheat Sheets — active */}
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

          {/* Character — placeholder */}
          <div className="block bg-gray-900 border border-gray-800 rounded-lg p-4 opacity-50">
            <h2 className="text-lg font-semibold text-gray-500">
              My Character
            </h2>
            <p className="text-gray-600 text-sm mt-1">Coming soon.</p>
          </div>

          {/* Handouts — placeholder */}
          <div className="block bg-gray-900 border border-gray-800 rounded-lg p-4 opacity-50">
            <h2 className="text-lg font-semibold text-gray-500">Handouts</h2>
            <p className="text-gray-600 text-sm mt-1">Coming soon.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
