"use client";

import { useEffect, useMemo, useState } from "react";

type PlatformKey = "youtube" | "spotify" | "apple" | "amazon";

const PLATFORM_LINKS: { key: PlatformKey; label: string; href: string }[] = [
  { key: "youtube", label: "YouTube", href: "https://www.youtube.com/" },
  { key: "spotify", label: "Spotify", href: "https://open.spotify.com/" },
  { key: "apple", label: "Apple Music", href: "https://music.apple.com/" },
  { key: "amazon", label: "Amazon Music", href: "https://music.amazon.com/" },
];

function looksLikeUrl(s: string) {
  const v = (s || "").trim();
  if (!v) return false;
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.includes("youtube.com") ||
    v.includes("youtu.be") ||
    v.includes("spotify.com") ||
    v.includes("music.apple.com") ||
    v.includes("itunes.apple.com") ||
    v.includes("music.amazon") ||
    v.includes("amazon.")
  );
}

function looksLikeYouTube(u: string) {
  const s = (u || "").toLowerCase();
  return s.includes("youtube.com") || s.includes("youtu.be");
}

function storageKey(eventCode: string) {
  return `djreq_sent:${String(eventCode || "").toUpperCase()}`;
}

function platformBtnClass(key: PlatformKey) {
  const base =
    "rounded-2xl px-3 py-2 text-xs font-extrabold text-zinc-950 transition shadow-[0_10px_30px_rgba(0,0,0,0.35)] active:scale-[0.99]";
  if (key === "youtube") return `${base} bg-gradient-to-r from-red-500 to-rose-400`;
  if (key === "spotify") return `${base} bg-gradient-to-r from-green-500 to-emerald-400`;
  if (key === "apple") return `${base} bg-gradient-to-r from-zinc-200 to-zinc-100`;
  return `${base} bg-gradient-to-r from-yellow-400 to-amber-300`;
}

export default function RequestClient({ code }: { code: string }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [dedication, setDedication] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");

  // carica storico da localStorage (solo questo telefono)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(code));
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        setSent(arr.filter((x) => typeof x === "string").slice(0, 30));
      }
    } catch {
      // ignore
    }
  }, [code]);

  // salva storico
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(code), JSON.stringify(sent.slice(0, 30)));
    } catch {
      // ignore
    }
  }, [sent, code]);

  const canSend = useMemo(() => {
    return title.trim().length > 0 || link.trim().length > 0;
  }, [title, link]);

  async function pasteFromClipboard() {
    setHint("");
    try {
      if (!navigator.clipboard?.readText) {
        setHint("⚠️ Il browser non supporta l’incolla automatico. Incolla manualmente.");
        return;
      }
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) {
        setHint("📋 Appunti vuoti. Copia prima un link dall’app musica.");
        return;
      }
      if (!looksLikeUrl(clip)) {
        setHint("⚠️ Negli appunti non sembra esserci un link. Copia il link della canzone e riprova.");
        return;
      }
      setLink(clip);
      setHint("✅ Link incollato dagli appunti.");
      setTimeout(() => setHint(""), 1600);
    } catch {
      setHint("⚠️ Permesso negato o non disponibile. Incolla manualmente.");
    }
  }

  async function addRequest() {
    const t = title.trim();
    const url = link.trim();
    if (!t && !url) return;

    setLoading(true);
    setHint("");

    try {
      let finalTitle = t || "Richiesta";

      async function tryOembed(endpoint: string) {
        try {
          const res = await fetch(endpoint);
          if (!res.ok) return null;
          const data = await res.json();
          return data?.title ? String(data.title) : null;
        } catch {
          return null;
        }
      }

      if (url) {
        if (looksLikeYouTube(url)) {
          const titleFrom = await tryOembed(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
          );
          if (titleFrom) finalTitle = titleFrom;
        } else if (url.toLowerCase().includes("spotify.com")) {
          const titleFrom = await tryOembed(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
          );
          if (titleFrom) finalTitle = titleFrom;
        }
      }

      const resp = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode: code,
          title: finalTitle,
          url,
          dedication: dedication.trim().slice(0, 180),
        }),
      });

      if (!resp.ok) {
        setHint("⚠️ Errore invio. Riprova.");
        return;
      }

      setSent((prev) => [finalTitle, ...prev].slice(0, 30));
      setTitle("");
      setLink("");
      setDedication("");
      setHint("✅ Inviata!");
      setTimeout(() => setHint(""), 1400);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center">
            <svg viewBox="0 0 64 64" className="h-20 w-20">
              <defs>
                <linearGradient id="mvGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>

              <path
                d="M12 34c0-12 8-22 20-22s20 10 20 22"
                fill="none"
                stroke="url(#mvGrad)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <rect x="6" y="32" width="10" height="20" rx="4" fill="url(#mvGrad)" />
              <rect x="48" y="32" width="10" height="20" rx="4" fill="url(#mvGrad)" />

              <text
                x="32"
                y="42"
                textAnchor="middle"
                fontSize="26"
                fontWeight="900"
                fontFamily="Arial, sans-serif"
                fill="#34d399"
              >
                M
              </text>
              <text
                x="34"
                y="46"
                textAnchor="middle"
                fontSize="26"
                fontWeight="900"
                fontFamily="Arial, sans-serif"
                fill="#fb7185"
              >
                V
              </text>
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/60 px-4 py-2 text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-pink-400 ring-1 ring-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            🎧 DJ Requests
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
            Invia una canzone
          </h1>

          <p className="mt-2 text-sm text-zinc-300">
            Evento:
            <span className="ml-2 rounded-full bg-zinc-800 px-3 py-1 font-mono text-zinc-100">
              {code}
            </span>
          </p>
        </header>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-zinc-200">
                Titolo (opzionale)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Freed from Desire"
                className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-200">
                Link (YouTube / Spotify / Apple / Amazon…)
              </label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Incolla qui il link condiviso"
                className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />

              {/* incolla subito sotto */}
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-black hover:bg-zinc-100 transition shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
                title="Legge il link dagli appunti e lo incolla (se possibile)"
              >
                📋 Incolla link
              </button>

              {/* dedica */}
              <div className="mt-3">
                <div className="mb-1 text-sm font-semibold text-zinc-200">
                  Dedica (opzionale)
                </div>
                <textarea
                  value={dedication}
                  onChange={(e) => setDedication(e.target.value)}
                  placeholder="Es: Per Vale ❤️ spacca tutto!"
                  rows={2}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>{dedication.length}/180</span>
                  {dedication.length > 40 && (
                    <span className="text-zinc-400">
                      (se è lunga, va in scorrimento)
                    </span>
                  )}
                </div>

                {dedication.trim() && (
                  <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                    <div className="text-xs text-zinc-500 mb-1">Anteprima dedica</div>
                    <div className="overflow-x-auto whitespace-nowrap text-sm text-zinc-200 italic">
                      💬 {dedication.trim()}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Party autoplay funziona solo con link YouTube. Gli altri link si aprono dal DJ.
              </p>
            </div>

            {/* invia sopra bottoni piattaforme */}
            <button
              onClick={addRequest}
              disabled={!canSend || loading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-pink-400 px-4 py-4 text-base font-extrabold text-zinc-950 transition disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
            >
              {loading ? "Invio..." : "🚀 Invia al DJ"}
            </button>

            {/* bottoni piattaforme */}
            <div className="pt-1">
              <div className="mb-2 text-xs text-zinc-500">
                Apri un’app, copia il link del brano, torna qui.
              </div>

              <div className="flex flex-wrap gap-2">
                {PLATFORM_LINKS.map((p) => (
                  <a
                    key={p.key}
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className={platformBtnClass(p.key)}
                    title={`Apri ${p.label}, poi copia il link della canzone e torna qui`}
                  >
                    Apri {p.label}
                  </a>
                ))}
              </div>

              {!!hint && (
                <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                  {hint}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Richieste inviate (solo questo telefono)
            </h2>
            <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              {sent.length}
            </span>
          </div>

          {sent.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">Nessuna richiesta ancora.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sent.slice(0, 10).map((r, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}

          {sent.length > 0 && (
            <div className="mt-3 text-xs text-zinc-500">
              Se svuoti i dati del browser o cambi telefono, questo storico non segue.
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-500">
          Nessun audio viene inviato. Solo link, titolo e dedica.
        </footer>
      </div>
    </div>
  );
}
