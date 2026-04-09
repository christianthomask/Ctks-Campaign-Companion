"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PuzzleEntry } from "@/lib/types/session";

interface PuzzleState {
  entries: PuzzleEntry[];
}

export function useSessionState(sessionId: string) {
  const [puzzleEntries, setPuzzleEntries] = useState<PuzzleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchState() {
      const { data } = await supabase
        .from("session_state")
        .select("state_value")
        .eq("session_id", sessionId)
        .eq("state_key", "puzzle_tracker")
        .single();

      if (data?.state_value) {
        const value = data.state_value as unknown as PuzzleState;
        setPuzzleEntries(value.entries || []);
      }

      setLoading(false);
    }

    fetchState();
  }, [sessionId]);

  const togglePuzzle = useCallback(
    (letter: string) => {
      // Optimistic update
      setPuzzleEntries((prev) => {
        const updated = prev.map((entry) =>
          entry.letter === letter ? { ...entry, found: !entry.found } : entry
        );

        // Debounce the Supabase write
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          const supabase = createClient();
          await supabase
            .from("session_state")
            .update({
              state_value: { entries: updated } as unknown as Record<string, unknown>,
            })
            .eq("session_id", sessionId)
            .eq("state_key", "puzzle_tracker");
        }, 300);

        return updated;
      });
    },
    [sessionId]
  );

  return { puzzleEntries, loading, togglePuzzle };
}
