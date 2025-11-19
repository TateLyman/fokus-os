"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type SessionRow = {
  id: string;
  created_at: string;
  goal: string | null;
  actual_duration_minutes: number | null;
  self_rating: number | null;
};

type SessionSummary = {
  total_minutes: number;
  session_count: number;
};

export default function DashboardPage() {
  const { loading, userId } = useAuthGuard();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.username) setUsername(profile.username);

      const { data, error } = await supabase
        .from("sessions")
        .select("id, created_at, goal, actual_duration_minutes, self_rating")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (!data) return;

      const total = data
        .map((s) => s.actual_duration_minutes || 0)
        .reduce((a, b) => a + b, 0);

      const count = data.length;

      setSummary({
        total_minutes: total,
        session_count: count,
      });

      setRecentSessions(data.slice(0, 5));
    };

    fetchAll();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Checking focus lab status…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              {username ? `Hey, ${username}.` : "Dashboard"}
            </h1>
            <p className="text-zinc-400 text-sm">
              Every block you run turns into data for your own focus experiment.
            </p>
          </div>

          {/* 🔥 Updated header with Insights + Lab Mode + Sign out */}
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/insights"
              className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-200 hover:border-fokusAccentSoft hover:text-fokusAccentSoft"
            >
              Insights
            </Link>

            <Link
              href="/lab"
              className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-200 hover:border-fokusAccentSoft hover:text-fokusAccentSoft"
            >
              Lab mode
            </Link>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Total focused
            </h2>
            <p className="mt-2 text-3xl font-semibold">
              {summary ? summary.total_minutes : 0}
              <span className="text-base text-zinc-400 ml-1">min</span>
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Sessions run
            </h2>
            <p className="mt-2 text-3xl font-semibold">
              {summary ? summary.session_count : 0}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Deep work mode
            </h2>
            <p className="mt-2 text-lg text-zinc-200">
              Ready
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-fokusAccent" />
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Start a FOKUS session</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Define a goal, pick your intensity, and drop into full-screen
              lock-in mode.
            </p>
          </div>
          <Link
            href="/session"
            className="px-6 py-3 rounded-full bg-fokusAccent text-black font-medium hover:bg-orange-500 whitespace-nowrap"
          >
            Launch Session Architect
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent sessions</h2>
            <p className="text-xs text-zinc-500">
              Last {recentSessions.length} blocks
            </p>
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No sessions yet. Start one above and come back after your first
              block.
            </p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium text-zinc-100 truncate">
                      {s.goal || "Unnamed focus block"}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Duration</p>
                      <p className="text-sm font-semibold">
                        {s.actual_duration_minutes ?? 0} min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Rating</p>
                      <p className="text-sm font-semibold">
                        {s.self_rating ?? "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
