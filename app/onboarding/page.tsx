"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function OnboardingPage() {
  const { loading, userId } = useAuthGuard();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [blockLength, setBlockLength] = useState(50);
  const [strictness, setStrictness] = useState<"chill" | "standard" | "brutal">(
    "standard"
  );
  const [envPreset, setEnvPreset] = useState<
    "red_lofi" | "blue_silence" | "warm_nature"
  >("red_lofi");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        if (data.username) setUsername(data.username);
        if (data.preferred_block_length)
          setBlockLength(data.preferred_block_length);
        if (data.strictness_level) {
          setStrictness(data.strictness_level);
        }
        if (data.environment_preset) {
          setEnvPreset(data.environment_preset);
        }
      }
    };

    fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        username,
        preferred_block_length: blockLength,
        strictness_level: strictness,
        environment_preset: envPreset,
      })
      .eq("id", userId);

    setSaving(false);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading your focus profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">Dial in FOKUS</h1>
        <p className="text-sm text-zinc-400 text-center">
          This config turns your sessions into a personal focus lab.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400">What should we call you?</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tate, masochist, focus goblin… your call"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">
              Default deep-work block length (minutes)
            </label>
            <input
              type="number"
              min={20}
              max={120}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-fokusAccent"
              value={blockLength}
              onChange={(e) =>
                setBlockLength(parseInt(e.target.value) || 50)
              }
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">How strict should FOKUS be?</label>
            <div className="mt-2 flex gap-2">
              {[
                { label: "Chill", value: "chill", desc: "gentle nudges" },
                {
                  label: "Standard",
                  value: "standard",
                  desc: "serious but humane",
                },
                { label: "Brutal", value: "brutal", desc: "no mercy" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setStrictness(opt.value as "chill" | "standard" | "brutal")
                  }
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs ${
                    strictness === opt.value
                      ? "bg-fokusAccent text-black border-fokusAccent"
                      : "bg-zinc-950 border-zinc-700 text-zinc-300"
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="block text-[10px] text-zinc-400">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400">
              Default environment preset (you can change later)
            </label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEnvPreset("red_lofi")}
                className={`rounded-xl border p-3 text-left ${
                  envPreset === "red_lofi"
                    ? "border-fokusAccent bg-gradient-to-br from-red-900/70 to-zinc-950"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                <div className="font-medium">Red + Lofi</div>
                <div className="text-[10px] text-zinc-400">
                  Aggressive tunnel vision.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEnvPreset("blue_silence")}
                className={`rounded-xl border p-3 text-left ${
                  envPreset === "blue_silence"
                    ? "border-fokusAccent bg-gradient-to-br from-sky-900/70 to-zinc-950"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                <div className="font-medium">Blue + Silence</div>
                <div className="text-[10px] text-zinc-400">
                  Calm, exam-mode vibes.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEnvPreset("warm_nature")}
                className={`rounded-xl border p-3 text-left ${
                  envPreset === "warm_nature"
                    ? "border-fokusAccent bg-gradient-to-br from-amber-900/70 to-zinc-950"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                <div className="font-medium">Warm + Nature</div>
                <div className="text-[10px] text-zinc-400">
                  Cozy grind, softer edges.
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-3 rounded-full bg-fokusAccent text-black font-medium text-sm hover:bg-orange-500 disabled:opacity-60"
        >
          {saving ? "Saving profile…" : "Save & go to dashboard"}
        </button>
      </div>
    </main>
  );
}
