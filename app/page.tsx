export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          FOKUS
        </h1>
        <p className="text-lg text-zinc-300">
          An experimental focus operating system that designs deep-work sessions,
          controls your environment, and turns your day into measurable lab
          runs.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/auth"
            className="px-6 py-3 rounded-full bg-fokusAccent text-black font-medium hover:bg-orange-500 transition"
          >
            Get Started
          </a>
          <a
            href="/about"
            className="px-6 py-3 rounded-full border border-zinc-600 text-sm text-zinc-200 hover:border-fokusAccentSoft hover:text-fokusAccentSoft transition"
          >
            Learn more
          </a>
        </div>
      </div>
    </main>
  );
}
