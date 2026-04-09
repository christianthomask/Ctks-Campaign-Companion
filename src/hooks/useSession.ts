"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionContent } from "@/lib/types/session";

interface SessionData {
  id: string;
  title: string;
  subtitle: string | null;
  session_number: number;
  content: SessionContent;
}

export function useSession(sessionId: string) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchSession() {
      const { data, error: fetchError } = await supabase
        .from("sessions")
        .select("id, title, subtitle, session_number, content")
        .eq("id", sessionId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setSession(data as unknown as SessionData);
      }

      setLoading(false);
    }

    fetchSession();
  }, [sessionId]);

  return { session, loading, error };
}
