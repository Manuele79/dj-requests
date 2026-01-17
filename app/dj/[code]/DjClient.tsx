"use client";

import { useEffect, useMemo, useState } from "react";
import EventQr from "@/app/components/EventQr";

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
    "rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition";

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

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        "ring-1",
        active
          ? "bg-white text-black ring-white shadow-[0_0_20px_rgba(255,255,255,0.18)]"
          : "bg-zinc-900/60 text-zinc-200 ring-zinc-700 hover:bg-zinc-800",
      ].join(" ")}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

export default function DjClient({ code }: { code: string }) {
  const [mode, setMode] = useState<"dj" | "party">("dj");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [eventName, setEventName] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => b.votes - a.votes || b.updatedAt - a.updatedAt
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

  function createEvent() {
    const safe = eventName.trim().toUpperCase().replace(/\s+/g, "-");
    if (!safe) return;
    window.location.href = `/dj/${safe}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* HEADER TOP */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1 text-xs text-zinc-200">
            🎧 DJ Console
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-pink-400">
                Richieste musicali
              </h1>

              <p className="mt-2 text-sm text-zinc-300">
                Evento:{" "}
                <span className="font-mono text-zinc-100 rounded-md bg-zinc-800 px-2 py-1">
                  {code}
                </span>
              </p>
            </div>

            {/* create event */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Nome evento"
                className="w-full sm:w-72 rounded-2xl bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
              />
              <button
                onClick={createEvent}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-black hover:bg-zinc-100 transition shadow-[0_0_18px_rgba(255,255,255,0.12)]"
              >
                Crea evento
              </button>
            </div>
          </div>

          {/* mode buttons */}
          <div className="flex flex-wrap gap-2">
            <ModeButton
              active={mode === "dj"}
              onClick={() => setMode("dj")}
              icon="🎛"
              label="DJ"
            />
            <ModeButton
              active={mode === "party"}
              onClick={() => setMode("party")}
              icon="🎉"
              label="Party"
            />
          </div>
        </div>

        {/* MAIN GRID: console left, QR right (desktop) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT: console */}
          <div className="lg:col-span-2">
            {mode === "party" ? (
              <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-3">
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

                <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                  <iframe
                    src={`/party/${code}`}
                    className="h-[82vh] w-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-100">
                    Console DJ
                  </div>
                  <div className="text-xs text-zinc-400">
                    Ordine: voti ▸ attività
                  </div>
                </div>

                {sorted.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
                    <div className="font-semibold text-zinc-100">
                      ⚠️ Evento scaduto o vuoto
                    </div>
                    <div className="mt-1 text-zinc-400">
                      Nessun video valido nelle ultime 12 ore. Se l’evento è
                      nuovo, invia una canzone dall’area ospiti.
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {sorted.map((r, idx) => (
                      <li
                        key={r.id}
                        className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-500">
                              #{idx + 1}
                            </div>
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
                              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-100 transition"
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

          {/* RIGHT: QR card */}
          <aside className="lg:col-span-1">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 sticky top-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-zinc-100">
                  Invito ospiti
                </div>
                <div className="text-xs text-zinc-400">
                  Scansiona e manda richieste
                </div>
              </div>

              <EventQr eventCode={code} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
