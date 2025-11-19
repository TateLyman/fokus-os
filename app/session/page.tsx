"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SessionPage() {
  const { loading, userId } = useAuthGuard();
  const router = useRouter();

  const [goal, setGoal] = useState("");
  const [plannedMinutes, setPlannedMinutes] = useState(50);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [selfRating, setSelfRating] = useState(7);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  // countdown timer
  useEffect(() => {
    if (!running || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [running, secondsLeft]);

  const startSession = () => {
    if (!goal.trim()) return;

    setStartedAt(new Date());
    setSecondsLeft(plannedMinutes * 60);
    setRunning(true);
  };

  const endSession = async () => {
    setRunning(false);

    if (!userId || !startedAt) {
      router.push("/dashboard");
      return;
    }

    const endedAt = new Date();
    const diffMinutes =
      (endedAt.getTime() - startedAt.getTime()) / 1000 / 60;

    await supabase.from("sessions").insert({
      user_id: userId,
      goal,
      planned_duration_minutes: plannedMinutes,
      actual_duration_minutes: Math.round(diffMinutes),
      distractions_count: distractions,
      self_rating: selfRating,
      environment_used: "default_red_lofi",
    });

    router.push("/dashboard");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Preparing lock-in mode…</p>
      </main>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fokusBg to-black">
      <div className="max-w-3xl w-full px-4">
        {!running ? (
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h1 className="text-2xl font-semibold text-center">
              Session Architect
            </h1>
            <p className="text-sm text-zinc-400 text-center">
              Define your deep-work block. Once you start, the screen becomes
              FOKUS-only.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400">
                  What&apos;s your focus goal for this block?
                </label>
                <textarea
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent resize-none"
                  rows={3}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Example: Draft APUSH essay intro and first body paragraph."
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-400">
                    Planned block length (minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
                    value={plannedMinutes}
                    onChange={(e) =>
                      setPlannedMinutes(parseInt(e.target.value) || 50)
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-400">Intensity</label>
                  <div className="mt-1 flex gap-2">
                    {[
                      { label: "Chill", value: 30 },
                      { label: "Standard", value: 50 },
                      { label: "Insane", value: 75 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setPlannedMinutes(opt.value)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs border ${
                          plannedMinutes === opt.value
                            ? "bg-fokusAccent text-black border-fokusAccent"
                            : "bg-zinc-950 border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {opt.label}
                        <span className="block text-[10px] text-zinc-400">
                          {opt.value} min
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={startSession}
              className="w-full mt-4 py-3 rounded-full bg-fokusAccent text-black font-medium text-sm hover:bg-orange-500"
            >
              Enter Lock-In Mode
            </button>
          </div>
        ) : (
          <div className="bg-zinc-950/80 border border-fokusAccent/30 rounded-3xl p-8 flex flex-col items-center space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              Fokus session running
            </p>
            <div className="text-6xl md:text-7xl font-semibold tabular-nums">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <p className="max-w-xl text-center text-sm text-zinc-300">
              {goal}
            </p>

            <div className="flex gap-4 mt-4">
              <button
                type="button"
                onClick={() => setDistractions((d) => d + 1)}
                className="px-4 py-2 rounded-full border border-zinc-700 text-xs text-zinc-300 hover:border-fokusAccentSoft hover:text-fokusAccentSoft"
              >
                I got distracted ({distractions})
              </button>
            </div>

            <div className="mt-6 w-full max-w-md space-y-2">
              <label className="text-xs text-zinc-400">
                How locked in do you feel right now? (1–10)
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={selfRating}
                onChange={(e) => setSelfRating(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-zinc-300">
                Current rating: <span className="font-medium">{selfRating}</span>
              </p>
            </div>

            <button
              onClick={endSession}
              className="mt-6 px-6 py-3 rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white"
            >
              End session & save data
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
