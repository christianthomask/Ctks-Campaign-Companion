"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-amber-400">
            Campaign Companion
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            D&D 5E session prep & reference
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg bg-gray-900 p-6 text-center">
            <div className="mb-3 text-2xl">&#x2709;</div>
            <h2 className="text-lg font-semibold text-gray-100">Check your email</h2>
            <p className="mt-2 text-sm text-gray-400">
              We sent a magic link to <span className="text-gray-200">{email}</span>.
              Click it to sign in.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm text-amber-400 hover:text-amber-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="dm@example.com"
                autoComplete="email"
                autoFocus
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-gray-950 transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Send Magic Link"}
            </button>

            <p className="text-center text-xs text-gray-500">
              No password needed. First signup becomes the DM.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
