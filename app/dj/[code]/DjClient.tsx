"use client";

import { useEffect, useMemo, useState } from "react";

type Platform = "youtube" | "spotify" | "apple" | "amazon" | "other";

type RequestItem = {
  id: string;
  eventCode: string;
  title: string;
  url: string;
  platform: Platform;
  youtubeVideoId: string;
  votes: number;
  createdAt: number;
  updatedAt: number;
};

function PlatformButton({ r }: { r: RequestItem }) {
  if (!r.url) return null;

  const base =
    "rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90";

  switch (r.platform) {
    case "youtube":
      return (
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className={`${base} bg-red-600`}
        >
          ▶ YouTube
        </a>
      );
    case "spotify":
      return (
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className={`${base} bg-green-600`}
        >
          🎵 Spotify
        </a>
      );
    case "apple":
      return (
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className={`${base} bg-zinc-700`}
        >
           Apple
        </a>
      );
    case "amazon":
      return (
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className={`${base} bg-yellow-600 text-black`}
        >
          🛒 Amazon
        </a>
      );
    default:
      return (
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className={`${base} bg-zinc-600`}
        >
          🔗 Link
        </a>
      );
  }
}

export default function DjClient({ code }: { code: string }) {
  const [mode, setMode] = useState<"dj" | "party">("dj");
  const [items, setItems] = useState<RequestItem[]>([]);

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => (b.votes - a.votes) || (b.updatedAt - a.updatedAt)
    );
  }, [items]);

  async function load() {
    try {
      const res = await fetch(
        `/api/requests?eventCode=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      const next: RequestItem[] = data.requests || [];

      setItems((prev) =>
        JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      );
    } catch {}
  }

  async function voteUp(r: RequestItem) {
    await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventCode: code,
        title: r.title,
        url: r.url,
      }),
    });
    load();
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1 text-xs text-zinc-200">
              🎧 DJ Console
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Richieste musicali
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              Evento: <span className="font-mono text-zinc-100">{code}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("dj")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === "dj"
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              🎛 DJ
            </button>

            <button
              onClick={() => setMode("party")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === "party"
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              🎉 Party
            </button>
          </div>
        </header>

        {/* PARTY MODE */}
        {mode === "party" ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
              <span>Party Mode (autoplay YouTube)</span>
              <a
                href={`/party/${code}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-200 hover:underline"
              >
                Apri fullscreen ↗
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <iframe
                src={`/party/${code}`}
                className="h-[82vh] w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          </section>
        ) : (
          /* DJ MODE */
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            {sorted.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nessuna richiesta ancora.
              </p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((r, idx) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-500">#{idx + 1}</div>
                        <div className="truncate font-semibold text-zinc-100">
                          {r.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-200">
                          🔥 {r.votes}
                        </span>

                        <PlatformButton r={r} />

                        <button
                          onClick={() => voteUp(r)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-100"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
