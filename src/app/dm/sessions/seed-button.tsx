"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSeed() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || "Failed to seed data");
      }
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleSeed}
        disabled={loading}
        className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-gray-950 transition-colors hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? "Seeding..." : "Seed Demo Session"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
