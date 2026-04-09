"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }

        if (!data.session) {
          setStatus("error");
          setErrorMsg("Account created! Check your email to confirm, then sign in.");
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }
      }

      // Auth succeeded — redirect to home, server will handle profile + routing
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Auth error:", err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-amber-400">
            Campaign Companion
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            D&D 5E session prep & reference
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={mode === "signup" ? "Choose a password (6+ chars)" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
            {status === "loading"
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
              ? "Create Account"
              : "Sign In"}
          </button>

          <p className="text-center text-sm text-gray-400">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrorMsg(""); setStatus("idle"); }}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setErrorMsg(""); setStatus("idle"); }}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-gray-500">
            First signup becomes the DM.
          </p>
        </form>
      </div>
    </div>
  );
}
