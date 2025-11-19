"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Experiment = {
  id: string;
  created_at: string;
  name: string;
  variable_name: string;
  metric_name: string;
  description: string | null;
};

type ExperimentRun = {
  id: string;
  experiment_id: string;
  created_at: string;
  condition_label: string;
  minutes: number | null;
  rating: number | null;
  notes: string | null;
};

export default function LabPage() {
  const { loading, userId } = useAuthGuard();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [runs, setRuns] = useState<ExperimentRun[]>([]);

  // new experiment form state
  const [name, setName] = useState("");
  const [variable, setVariable] = useState("lighting_color");
  const [metric, setMetric] = useState("self_focus_rating_1_10");
  const [description, setDescription] = useState(
    "Testing how different lighting setups affect my focus rating."
  );
  const [savingExperiment, setSavingExperiment] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      const { data: exps, error: expError } = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (expError) {
        console.error(expError);
        return;
      }

      setExperiments(exps || []);

      const { data: runsData, error: runsError } = await supabase
        .from("experiment_runs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (runsError) {
        console.error(runsError);
        return;
      }

      setRuns(runsData || []);
    };

    fetchAll();
  }, [userId]);

  const handleCreateExperiment = async () => {
    if (!userId || !name.trim()) return;
    setSavingExperiment(true);

    const { data, error } = await supabase
      .from("experiments")
      .insert({
        user_id: userId,
        name,
        variable_name: variable,
        metric_name: metric,
        description,
      })
      .select()
      .single();

    setSavingExperiment(false);

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setExperiments((prev) => [data as Experiment, ...prev]);
      // reset form just a bit
      setName("");
    }
  };

  const handleRunLogged = (run: ExperimentRun) => {
    setRuns((prev) => [run, ...prev]);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading lab mode…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Lab mode</h1>
            <p className="text-zinc-400 text-sm">
              Define experiments and log how different setups affect your
              sessions.
            </p>
          </div>
        </header>

        {/* New experiment form */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create an experiment</h2>
          <p className="text-xs text-zinc-400">
            Example: “Lighting color vs focus” with variable{" "}
            <code className="text-[11px] bg-zinc-800 px-1 rounded">
              lighting_color
            </code>{" "}
            and metric{" "}
            <code className="text-[11px] bg-zinc-800 px-1 rounded">
              self_focus_rating_1_10
            </code>
            .
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Experiment name</label>
              <input
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lighting color vs focus"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">
                Variable being tested
              </label>
              <input
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Metric you care about</label>
            <input
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="self_focus_rating_1_10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            onClick={handleCreateExperiment}
            disabled={savingExperiment}
            className="px-6 py-2 rounded-full bg-fokusAccent text-black text-sm font-medium hover:bg-orange-500 disabled:opacity-60"
          >
            {savingExperiment ? "Creating…" : "Create experiment"}
          </button>
        </section>

        {/* Experiment list */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your experiments</h2>
          {experiments.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No experiments yet. Create one above, then start logging runs
              after your focus sessions.
            </p>
          ) : (
            <div className="space-y-4">
              {experiments.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  runs={runs.filter((r) => r.experiment_id === exp.id)}
                  onRunLogged={handleRunLogged}
                  userId={userId!}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type ExperimentCardProps = {
  experiment: Experiment;
  runs: ExperimentRun[];
  onRunLogged: (run: ExperimentRun) => void;
  userId: string;
};

function ExperimentCard({
  experiment,
  runs,
  onRunLogged,
  userId,
}: ExperimentCardProps) {
  const [condition, setCondition] = useState("");
  const [minutes, setMinutes] = useState(50);
  const [rating, setRating] = useState(7);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveRun = async () => {
    if (!condition.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("experiment_runs")
      .insert({
        user_id: userId,
        experiment_id: experiment.id,
        condition_label: condition,
        minutes,
        rating,
        notes,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      onRunLogged(data as ExperimentRun);
      setNotes("");
    }
  };

  // compute stats per condition
  const statsByCondition: Record<
    string,
    { count: number; avgRating: number | null }
  > = {};

  runs.forEach((r) => {
    const key = r.condition_label;
    if (!statsByCondition[key]) {
      statsByCondition[key] = { count: 0, avgRating: null };
    }
    const existing = statsByCondition[key];
    const currentSum =
      (existing.avgRating ?? 0) * existing.count + (r.rating ?? 0);
    const newCount = existing.count + 1;
    statsByCondition[key] = {
      count: newCount,
      avgRating:
        newCount > 0 ? Math.round((currentSum / newCount) * 10) / 10 : null,
    };
  });

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{experiment.name}</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Variable:{" "}
            <code className="bg-zinc-800 px-1 rounded text-[11px]">
              {experiment.variable_name}
            </code>{" "}
            • Metric:{" "}
            <code className="bg-zinc-800 px-1 rounded text-[11px]">
              {experiment.metric_name}
            </code>
          </p>
          {experiment.description && (
            <p className="mt-2 text-xs text-zinc-400 max-w-xl">
              {experiment.description}
            </p>
          )}
        </div>
        <div className="text-xs text-zinc-400">
          <p>
            Runs logged:{" "}
            <span className="font-semibold text-zinc-100">{runs.length}</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      {runs.length > 0 && (
        <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/60">
          <p className="text-xs text-zinc-400 mb-2">
            Condition performance (avg rating)
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statsByCondition).map(([label, stats]) => (
              <div
                key={label}
                className="px-3 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-xs flex items-center gap-2"
              >
                <span className="font-medium text-zinc-100">{label}</span>
                <span className="text-[11px] text-zinc-400">
                  {stats.avgRating ?? "-"} / 10 • {stats.count} runs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log a run */}
      <div className="grid gap-3 md:grid-cols-[2fr,1fr,1fr] text-xs">
        <div className="space-y-1">
          <label className="text-zinc-400">
            Condition label (what setup did you use?)
          </label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder='e.g. "Red lamp + lofi" or "Blue LED + silence"'
          />
        </div>
        <div className="space-y-1">
          <label className="text-zinc-400">Session length (minutes)</label>
          <input
            type="number"
            min={5}
            max={240}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-zinc-400">Focus rating (1–10)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="w-6 text-right text-sm">{rating}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-400">Notes (optional)</label>
        <textarea
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Example: felt sleepy at 30 min, music got distracting halfway…"
        />
      </div>
      <button
        onClick={handleSaveRun}
        disabled={saving}
        className="px-5 py-2 rounded-full bg-zinc-100 text-zinc-900 text-xs font-medium hover:bg-white disabled:opacity-60"
      >
        {saving ? "Logging…" : "Log run"}
      </button>
    </div>
  );
}
