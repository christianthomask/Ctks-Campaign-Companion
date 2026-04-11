"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "no-auth" | "joining" | "success" | "already" | "error">("loading");
  const [campaignName, setCampaignName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function tryJoin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("no-auth");
        return;
      }

      setStatus("joining");

      const res = await fetch("/api/campaigns/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Failed to join");
        return;
      }

      setCampaignName(data.campaign_name || "the campaign");

      if (data.already_member) {
        setStatus("already");
      } else {
        setStatus("success");
      }

      // Redirect to player dashboard after a moment
      setTimeout(() => router.push("/player"), 2000);
    }

    tryJoin();
  }, [code, router]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-6 text-2xl font-bold text-amber-400">Campaign Companion</h1>

        {status === "loading" && (
          <p className="text-gray-400">Loading...</p>
        )}

        {status === "no-auth" && (
          <div className="rounded-lg bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-100">
              You&apos;ve been invited!
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Sign in or create an account to join the campaign.
            </p>
            <Link
              href={`/auth/login?next=/join/${code}`}
              className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-gray-950 hover:bg-amber-500"
            >
              Sign In to Join
            </Link>
          </div>
        )}

        {status === "joining" && (
          <p className="text-gray-400">Joining campaign...</p>
        )}

        {status === "success" && (
          <div className="rounded-lg bg-green-950/30 border border-green-800 p-6">
            <h2 className="text-lg font-semibold text-green-300">Welcome!</h2>
            <p className="mt-2 text-sm text-gray-300">
              You&apos;ve joined <span className="font-semibold text-amber-400">{campaignName}</span>.
            </p>
            <p className="mt-2 text-xs text-gray-500">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === "already" && (
          <div className="rounded-lg bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-100">Already a member!</h2>
            <p className="mt-2 text-sm text-gray-400">
              You&apos;re already in <span className="text-amber-400">{campaignName}</span>.
            </p>
            <p className="mt-2 text-xs text-gray-500">Redirecting...</p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg bg-red-950/30 border border-red-800 p-6">
            <h2 className="text-lg font-semibold text-red-300">Invalid Link</h2>
            <p className="mt-2 text-sm text-gray-400">{errorMsg}</p>
            <Link
              href="/auth/login"
              className="mt-4 inline-block text-sm text-amber-400 hover:text-amber-300"
            >
              Go to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
