"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Create profile row after signup
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            username: email.split("@")[0],
            preferred_block_length: 50,
            strictness_level: "standard",
            environment_preset: "red_lofi",
          });
        }

        // NEW USERS → onboarding
        router.push("/onboarding");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // EXISTING USERS → dashboard
        if (data.user) {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">FOKUS</h1>
        <p className="text-sm text-zinc-400 text-center">
          {mode === "signup"
            ? "Create an account to start building your focus lab."
            : "Welcome back. Let’s lock in."}
        </p>

        <div className="flex justify-center gap-2 text-sm">
          <button
            onClick={() => setMode("signup")}
            className={`px-3 py-1 rounded-full ${
              mode === "signup"
                ? "bg-fokusAccent text-black"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Sign up
          </button>

          <button
            onClick={() => setMode("signin")}
            className={`px-3 py-1 rounded-full ${
              mode === "signin"
                ? "bg-fokusAccent text-black"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Sign in
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Email</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Password</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 text-center">{errorMsg}</p>
        )}

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full py-2 rounded-full bg-fokusAccent text-black font-medium hover:bg-orange-500 disabled:opacity-60"
        >
          {loading
            ? "Working..."
            : mode === "signup"
            ? "Create account"
            : "Sign in"}
        </button>
      </div>
    </main>
  );
}
