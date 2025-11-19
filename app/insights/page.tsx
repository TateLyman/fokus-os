"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type SessionRow = {
  id: string;
  created_at: string;
  actual_duration_minutes: number | null;
  self_rating: number | null;
  distractions_count: number | null;
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

type FocusDay = {
  dateKey: string;
  label: string;
  minutes: number;
};

type ConditionStat = {
  experimentName: string;
  condition: string;
  avgRating: number;
  runCount: number;
};

export default function InsightsPage() {
  const { loading, userId } = useAuthGuard();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [focusByDay, setFocusByDay] = useState<FocusDay[]>([]);
  const [conditionStats, setConditionStats] = useState<ConditionStat[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [avgDistractions, setAvgDistractions] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      // sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("id, created_at, actual_duration_minutes, self_rating, distractions_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (sessionError) {
        console.error(sessionError);
        return;
      }

      const sessions = (sessionData || []) as SessionRow[];
      setSessions(sessions);
      buildFocusByDay(sessions);
      computeSessionAverages(sessions);

      // experiments + runs
      const { data: experiments, error: expError } = await supabase
        .from("experiments")
        .select("id, name")
        .eq("user_id", userId);

      if (expError) {
        console.error(expError);
        return;
      }

      const { data: runs, error: runError } = await supabase
        .from("experiment_runs")
        .select("id, experiment_id, condition_label, rating")
        .eq("user_id", userId);

      if (runError) {
        console.error(runError);
        return;
      }

      buildConditionStats(
        (experiments || []) as ExperimentRow[],
        (runs || []) as RunRow[]
      );
    };

    fetchData();
  }, [userId]);

  const buildFocusByDay = (sessions: SessionRow[]) => {
    // map of YYYY-MM-DD -> total minutes
    const byDate = new Map<string, number>();

    sessions.forEach((s) => {
      const d = new Date(s.created_at);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const current = byDate.get(key) || 0;
      byDate.set(key, current + (s.actual_duration_minutes || 0));
    });

    const days: FocusDay[] = [];
    const today = new Date();

    // last 14 days, oldest to newest
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const minutes = byDate.get(key) || 0;

      days.push({
        dateKey: key,
        label,
        minutes,
      });
    }

    setFocusByDay(days);
  };

  const computeSessionAverages = (sessions: SessionRow[]) => {
    if (sessions.length === 0) {
      setAvgRating(null);
      setAvgDistractions(null);
      return;
    }

    let ratingSum = 0;
    let ratingCount = 0;
    let distSum = 0;
    let distCount = 0;

    sessions.forEach((s) => {
      if (s.self_rating != null) {
        ratingSum += s.self_rating;
        ratingCount += 1;
      }
      if (s.distractions_count != null) {
        distSum += s.distractions_count;
        distCount += 1;
      }
    });

    setAvgRating(
      ratingCount > 0
        ? Math.round((ratingSum / ratingCount) * 10) / 10
        : null
    );
    setAvgDistractions(
      distCount > 0 ? Math.round((distSum / distCount) * 10) / 10 : null
    );
  };

  const buildConditionStats = (
    experiments: ExperimentRow[],
    runs: RunRow[]
  ) => {
    if (experiments.length === 0 || runs.length === 0) {
      setConditionStats([]);
      return;
    }

    const expMap = new Map<string, ExperimentRow>();
    experiments.forEach((e) => expMap.set(e.id, e));

    // key: experiment_id + "::" + condition_label
    const agg: Record<
      string,
      { expId: string; condition: string; sum: number; count: number }
    > = {};

    runs.forEach((r) => {
      if (r.rating == null) return;
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
    });

    const stats: ConditionStat[] = Object.values(agg)
      .filter((entry) => entry.count > 0)
      .map((entry) => {
        const exp = expMap.get(entry.expId);
        const avg = entry.sum / entry.count;
        return {
          experimentName: exp ? exp.name : "Unknown experiment",
          condition: entry.condition,
          avgRating: Math.round(avg * 10) / 10,
          runCount: entry.count,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating) // best first
      .slice(0, 5); // top 5 conditions

    setConditionStats(stats);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Crunching your focus data…</p>
      </main>
    );
  }

  const totalMinutes = sessions
    .map((s) => s.actual_duration_minutes || 0)
    .reduce((a, b) => a + b, 0);

  const totalSessions = sessions.length;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Insights</h1>
          <p className="text-sm text-zinc-400">
            This is your focus lab report — minutes, patterns, and which setups
            actually work.
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Total focus minutes
            </h2>
            <p className="mt-2 text-3xl font-semibold">
              {totalMinutes}
              <span className="text-base text-zinc-400 ml-1">min</span>
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Sessions run
            </h2>
            <p className="mt-2 text-3xl font-semibold">{totalSessions}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Avg focus rating
            </h2>
            <p className="mt-2 text-3xl font-semibold">
              {avgRating ?? "-"}
              <span className="text-base text-zinc-400 ml-1">
                / 10
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs text-zinc-400 uppercase tracking-wide">
              Avg distractions
            </h2>
            <p className="mt-2 text-3xl font-semibold">
              {avgDistractions ?? "-"}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              per session (tap “I got distracted” during runs)
            </p>
          </div>
        </section>

        {/* Focus over time */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Last 14 days</h2>
            <p className="text-xs text-zinc-500">
              Total focused minutes per day
            </p>
          </div>
          <div className="h-64">
            {focusByDay.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No data yet. Run a few sessions and check back.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={focusByDay}>
                  <defs>
                    <linearGradient
                      id="colorMinutes"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#e4e4e7" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="#fb923c"
                    fillOpacity={1}
                    fill="url(#colorMinutes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Condition stats */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Best-performing environments
            </h2>
            <p className="text-xs text-zinc-500">
              Based on Lab mode experiment runs
            </p>
          </div>

          {conditionStats.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No experiment data yet. Create an experiment in Lab mode and log a
              few runs with different conditions.
            </p>
          ) : (
            <div className="space-y-2">
              {conditionStats.map((stat, idx) => (
                <div
                  key={`${stat.experimentName}-${stat.condition}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm"
                >
                  <div className="flex-1">
                    <p className="text-zinc-200 font-medium">
                      {stat.condition}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Experiment: {stat.experimentName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-[11px] text-zinc-400">Avg rating</p>
                      <p className="text-sm font-semibold">
                        {stat.avgRating} / 10
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-zinc-400">Runs</p>
                      <p className="text-sm font-semibold">
                        {stat.runCount}
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
