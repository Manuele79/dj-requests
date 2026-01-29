"use client";

import { useEffect, useMemo, useState } from "react";
import EventQr from "@/app/components/EventQr";

type Platform = "youtube" | "spotify" | "apple" | "amazon" | "other";

type RequestItem = {
  id: string;
  eventCode: string;
  title: string;
  url: string;
  dedication: string;

  platform: Platform;
  youtubeVideoId: string;
  votes: number;
  createdAt: number;
  updatedAt: number;
};

function PlatformButton({ r }: { r: RequestItem }) {
  if (!r.url) return null;

  const base =
    "rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition shadow-[0_6px_18px_rgba(0,0,0,0.25)]";

  switch (r.platform) {
    case "youtube":
      return (
        <a href={r.url} target="_blank" rel="noreferrer" className={`${base} bg-red-600`}>
          ▶ YouTube
        </a>
      );
    case "spotify":
      return (
        <a href={r.url} target="_blank" rel="noreferrer" className={`${base} bg-green-600`}>
          🎵 Spotify
        </a>
      );
    case "apple":
      return (
        <a href={r.url} target="_blank" rel="noreferrer" className={`${base} bg-zinc-700`}>
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
        <a href={r.url} target="_blank" rel="noreferrer" className={`${base} bg-zinc-600`}>
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
  variant,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  variant: "dj" | "party";
}) {
  const activeClass =
    variant === "dj"
      ? "bg-gradient-to-r from-emerald-400 to-teal-300 text-zinc-950 ring-emerald-300/40 shadow-[0_0_25px_rgba(52,211,153,0.20)]"
      : "bg-gradient-to-r from-amber-300 to-orange-400 text-zinc-950 ring-amber-300/40 shadow-[0_0_25px_rgba(251,191,36,0.22)]";


  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-6 py-3 text-sm font-extrabold transition inline-flex items-center justify-center gap-2 min-w-[140px]",

        "ring-1",
        active
          ? activeClass
          : "bg-zinc-900/60 text-zinc-200 ring-zinc-700 hover:bg-zinc-800",
      ].join(" ")}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

function FakeSpectrum() {
  return (
    <div className="mt-3 flex items-end gap-1.5 h-7">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-emerald-400 via-cyan-300 to-pink-300 opacity-80 animate-[eq_1.2s_ease-in-out_infinite]"
          style={{
            animationDelay: `${i * 70}ms`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes eq {
          0%   { height: 20%; opacity: .55; }
          25%  { height: 95%; opacity: .95; }
          50%  { height: 35%; opacity: .65; }
          75%  { height: 80%; opacity: .9; }
          100% { height: 20%; opacity: .55; }
        }
      `}</style>
    </div>
  );
}





export default function DjClient({ code }: { code: string }) {
  const [mode, setMode] = useState<"dj" | "party">("dj");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [eventName, setEventName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  

  function resetPartyUnlock() {
    try {
      localStorage.removeItem(
        `djreq_party_started:${String(code || "").toUpperCase()}`
      );
    } catch {}
  }



  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => b.votes - a.votes || b.updatedAt - a.updatedAt
    );
  }, [items]);

  async function load() {
    try {
      const res = await fetch(`/api/requests?eventCode=${encodeURIComponent(code)}`);
      const data = await res.json();
      const next: RequestItem[] = (data.requests || []).map((r: any) => ({
     ...r,
     dedication: String(r.dedication ?? ""),
    }));


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

  async function createEvent() { 
  const safe = eventName.trim().toUpperCase().replace(/\s+/g, "-");
  if (!safe) return;

  const password = prompt("Password per creare evento:");
  if (!password) return;

  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventCode: safe, password }),
  });

  if (!res.ok) {
    alert("Password errata o errore creazione evento");
    return;
  }

  window.location.href = `/dj/${safe}`;
}
async function joinExistingEvent() {
  const safe = joinCode.trim().toUpperCase().replace(/\s+/g, "-");
  if (!safe) return;

  setJoinMsg("");

  try {
    const res = await fetch(`/api/events?eventCode=${encodeURIComponent(safe)}`, {
      cache: "no-store",
    });

    if (res.status === 200) {
      window.location.href = `/dj/${safe}`;
      return;
    }

    if (res.status === 410) {
      setJoinMsg("⏳ Evento scaduto (creane uno nuovo).");
      return;
    }

    setJoinMsg("❌ Evento non trovato.");
  } catch {
    setJoinMsg("⚠️ Errore di rete.");
  }
}



  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100 overflow-hidden">
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-56 right-[-160px] h-[600px] w-[600px] rounded-full bg-pink-400/20 blur-[140px]" />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* HEADER TOP */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              {/* Logo MV */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-pink-400 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                <span className="text-2xl font-black text-zinc-950">MV</span>
              </div>

              {/* Titolo */}
              <div>
                <div className="text-lg sm:text-x2 font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-pink-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                  🎧 AskDJ
                </div>

                <div className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">Music Requests</div>
              </div>
            </div>


            <div className="text-sm font-bold text-zinc-400">
               <span className="text-zinc-400">Evento</span>
               <span className="ml-2 inline-flex items-center rounded-full px-4 py-2 font-mono text-base font-extrabold text-zinc-950 bg-gradient-to-r from-emerald-300 via-cyan-300 to-pink-300 shadow-[0_0_22px_rgba(34,211,238,0.25)]">
                 {code}
               </span>
             </div>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-pink-400">
                Richieste Musicali
              </h1>
              <FakeSpectrum />

              <p className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                Gestisci la coda e manda il link agli ospiti con il QR.
              </p>
            </div>

            {/* create event */}
            <div className="flex flex-col gap-2 sm:flex-col sm:items-end">
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Nome evento"
                className="w-full sm:w-72 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 transition"

              />
              <button
                onClick={createEvent}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400 px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-[0_0_26px_rgba(34,211,238,0.18)] hover:brightness-110 transition"

              >
                Crea evento
              </button>
            </div>
          </div>
          {/* join event */}
          <div className="flex flex-col gap-2 sm:flex-col sm:items-end mt-4">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Codice evento esistente"
              className="w-full sm:w-72 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-pink-400/70 focus:ring-2 focus:ring-pink-400/20 transition"

            />
            <button
              onClick={joinExistingEvent}
              className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-[0_0_22px_rgba(251,113,133,0.18)] hover:brightness-110 transition"

            >
              Entra
            </button>
          </div>

{joinMsg && (
  <div className="mt-2 text-sm text-zinc-400">
    {joinMsg}
  </div>
)}


          {/* mode buttons */}
          <div className="flex gap-4 justify-center">
            <ModeButton
              active={mode === "dj"}
              onClick={() => {
                resetPartyUnlock();
                setMode("dj");
              }}

              icon="🎛"
              label="DJ"
              variant="dj"
            />
            <ModeButton
              active={mode === "party"}
              onClick={() => {
                resetPartyUnlock();
                setMode("party");
              }}

              icon="🎉"
              label="Party"
              variant="party"
            />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT */}
          <div className="lg:col-span-2">
            {mode === "party" ? (
              <section className="rounded-3xl border border-zinc-700/80 bg-zinc-900/60 shadow-[0_0_35px_rgba(0,0,0,0.45)]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span className="min-w-0 truncate">Party Autoplay YouTube</span>
                  <a
                    href={`/party/${code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap text-zinc-200 hover:underline"
                  >
                    Apri-Fullscreen↗
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
              <section className="rounded-3xl border border-zinc-700/80 bg-zinc-900/60 shadow-[0_0_35px_rgba(0,0,0,0.45)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
  
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                      Console DJ
                    </div>
                    <div className="text-xs text-zinc-400">
                      Gestione richieste in tempo reale
                    </div>
                  </div>

                  <div className="whitespace-nowrap text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-300">
                    Classifica
                  </div>

                </div>


                {sorted.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 pt-6 text-sm text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                    <div className="font-semibold text-zinc-100">
                      ⚠️ Evento scaduto o vuoto
                    </div>
                    <div className="mt-1 text-zinc-400">
                      Nessun video valido nelle ultime 12 ore. Se l’evento è nuovo,
                      invia una canzone dall’area ospiti.
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {sorted.map((r, idx) => (
                      <li
                        key={r.id}
                        className="rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950/55 p-4 pt-6 shadow-[0_14px_45px_rgba(0,0,0,0.35)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-500">#{idx + 1}</div>
                            <div className="truncate text-base font-extrabold text-zinc-100">
                              {r.title}
                            </div>
                            {r.dedication && (
                            <div className="mt-1 truncate text-xs text-zinc-400 italic">
                             💬 {r.dedication}
                            </div>
                           )}

                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-extrabold text-zinc-200 shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
                              🔥 {r.votes}
                            </span>

                            <PlatformButton r={r} />

                            
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          {/* RIGHT: QR */}
          <aside className="lg:col-span-1">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 sticky top-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="mb-3">
                <div className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                  INVITO OSPITI:
                </div>
                <div className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">Scansiona e manda richieste</div>
              </div>

              <EventQr eventCode={code} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
