"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type SessionRow = {
  id: string;
  created_at: string;
  actual_duration_minutes: number | null;
  self_rating: number | null;
  distractions_count?: number | null;
};

type ExperimentRow = {
  id: string;
  name: string;
};

type RunRow = {
  id: string;
  experiment_id: string;
  condition_label: string;
  rating: number | null;
};

type ConditionStat = {
  experimentName: string;
  condition: string;
  avgRating: number;
  runCount: number;
};

export default function CoachPage() {
  const { loading, userId } = useAuthGuard();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);

  const [question, setQuestion] = useState(
    "Design a 7-day deep-work protocol around my strongest times and best-performing environments."
  );
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("id, created_at, actual_duration_minutes, self_rating, distractions_count")
        .eq("user_id", userId);

      setSessions((sessionData || []) as SessionRow[]);

      const { data: expData } = await supabase
        .from("experiments")
        .select("id, name")
        .eq("user_id", userId);

      setExperiments((expData || []) as ExperimentRow[]);

      const { data: runData } = await supabase
        .from("experiment_runs")
        .select("id, experiment_id, condition_label, rating")
        .eq("user_id", userId);

      setRuns((runData || []) as RunRow[]);
    };

    fetchData();
  }, [userId]);

  const {
    totalMinutes,
    totalSessions,
    avgRating,
    avgDistractions,
    topConditions,
  } = useMemo(() => {
    const totalMinutes = sessions.reduce(
      (acc, s) => acc + (s.actual_duration_minutes || 0),
      0
    );
    const totalSessions = sessions.length;

    const ratingValues = sessions
      .map((s) => s.self_rating)
      .filter((x): x is number => x != null);

    const avgRating =
      ratingValues.length > 0
        ? Math.round((ratingValues.reduce((a, b) => a + b) / ratingValues.length) * 10) /
          10
        : null;

    const distValues = sessions
      .map((s) => s.distractions_count ?? null)
      .filter((x): x is number => x != null);

    const avgDistractions =
      distValues.length > 0
        ? Math.round((distValues.reduce((a, b) => a + b) / distValues.length) * 10) /
          10
        : null;

    const expMap = new Map(experiments.map((e) => [e.id, e]));

    const agg: Record<
      string,
      { expId: string; condition: string; sum: number; count: number }
    > = {};

    for (const r of runs) {
      if (r.rating == null) continue;

      const key = `${r.experiment_id}::${r.condition_label}`;
      if (!agg[key]) {
        agg[key] = {
          expId: r.experiment_id,
          condition: r.condition_label,
          sum: 0,
          count: 0,
        };
      }

      agg[key].sum += r.rating;
      agg[key].count += 1;
    }

    const conditionStats: ConditionStat[] = Object.values(agg)
      .map((e) => ({
        experimentName: expMap.get(e.expId)?.name || "Unknown experiment",
        condition: e.condition,
        avgRating: Math.round((e.sum / e.count) * 10) / 10,
        runCount: e.count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 3);

    return {
      totalMinutes,
      totalSessions,
      avgRating,
      avgDistractions,
      topConditions: conditionStats,
    };
  }, [sessions, experiments, runs]);

  const statsSummary = useMemo(() => {
    const base = [
      `Total sessions: ${totalSessions}`,
      `Total focus minutes: ${totalMinutes}`,
      `Average focus rating: ${avgRating ?? "n/a"}`,
      `Average distractions per session: ${avgDistractions ?? "n/a"}`,
    ];

    if (topConditions.length === 0) {
      base.push(
        "No experiment runs yet — Coach should suggest what to test."
      );
    } else {
      base.push("Top experiment conditions:");
      topConditions.forEach((c) =>
        base.push(
          `- ${c.condition} (${c.avgRating}/10 over ${c.runCount} runs) in "${c.experimentName}"`
        )
      );
    }

    return base.join("\n");
  }, [totalSessions, totalMinutes, avgRating, avgDistractions, topConditions]);

  const askCoach = async () => {
    setAsking(true);
    setErrorMsg(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, statsSummary }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAnswer(data.answer);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAsking(false);
    }
  };

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading coach…</p>
      </main>
    );

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold">FOKUS Coach</h1>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 text-sm">
          <h2 className="text-base font-semibold">Your current baseline</h2>
          <p className="text-zinc-300">
            Sessions: {totalSessions} • Total minutes: {totalMinutes}
          </p>
          <p className="text-zinc-300">
            Avg rating: {avgRating ?? "n/a"} • Avg distractions:
            {" "}{avgDistractions ?? "n/a"}
          </p>

          {topConditions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-zinc-400">
                Top Lab conditions:
              </p>
              {topConditions.map((c, i) => (
                <p key={i} className="text-xs text-zinc-300">
                  • {c.condition} ({c.avgRating}/10, {c.runCount} runs)
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <textarea
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          {errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}

          <button
            onClick={askCoach}
            disabled={asking}
            className="px-6 py-2 rounded-full bg-fokusAccent text-black text-sm font-medium hover:bg-orange-500"
          >
            {asking ? "Thinking…" : "Ask Coach"}
          </button>

          {answer && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm whitespace-pre-wrap">
              {answer}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
