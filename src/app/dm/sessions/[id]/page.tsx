import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SessionViewer } from "@/components/session/SessionViewer";
import type { SessionContent } from "@/lib/types/session";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, subtitle, session_number, content")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  return (
    <SessionViewer
      sessionId={session.id}
      content={session.content as unknown as SessionContent}
      title={session.title}
      subtitle={session.subtitle}
    />
  );
}
