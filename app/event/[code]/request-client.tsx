"use client";

import { useMemo, useState } from "react";

export default function RequestClient({ code }: { code: string }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(() => {
    return title.trim().length > 0 || link.trim().length > 0;
  }, [title, link]);

  function looksLikeYouTube(u: string) {
    return u.includes("youtube.com") || u.includes("youtu.be");
  }

  async function addRequest() {
    const t = title.trim();
    const url = link.trim();
    if (!t && !url) return;

    setLoading(true);
    try {
      let finalTitle = t || "Richiesta";
      const finalUrl = url;

      // Se è YouTube e c’è link → prova titolo automatico
      if (finalUrl && looksLikeYouTube(finalUrl)) {
        try {
          const res = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(finalUrl)}&format=json`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.title) finalTitle = data.title;
          }
        } catch {}
      }

      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode: code,
          title: finalTitle,
          url: finalUrl, // <— nuovo campo
        }),
      });

      setSent((prev) => [finalTitle, ...prev]);
      setTitle("");
      setLink("");
    } finally {
      setLoading(false);
    }
  }

  return (
   <div className="min-h-screen text-zinc-100 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.18),_transparent_45%),radial-gradient(ellipse_at_bottom,_rgba(236,72,153,0.18),_transparent_45%),linear-gradient(to_bottom,_#050507,_#070712)]">

      <div className="mx-auto max-w-2xl px-4 py-8">
  <header className="mb-8 text-center">
  {/* Logo MV */}
  <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
    <div className="relative h-10 w-10">
      <span className="absolute left-0 top-0 text-3xl font-extrabold leading-none text-emerald-400 drop-shadow">
        M
      </span>
      <span className="absolute left-0 top-4 text-3xl font-extrabold leading-none text-pink-400 drop-shadow">
        V
      </span>
    </div>
  </div>

  {/* Badge */}
  <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
  <span className="bg-gradient-to-r from-emerald-400 to-pink-400 bg-clip-text text-transparent">
    DJ Requests
  </span>
</h2>

  <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
    Invia una canzone
  </h1>

  <p className="mt-2 text-base text-zinc-200">
    Evento:{" "}
    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-lg text-white">
      {code}
    </span>
  </p>
</header>



        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-300">
                Titolo (o incolli un link sotto)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Freed from Desire"
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-300">
                Link (YouTube / Spotify / Apple / Amazon…)
              </label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Incolla qui il link condiviso"
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Party autoplay funziona solo con link YouTube. Gli altri link si aprono dal DJ.
              </p>
            </div>

            <button
              onClick={addRequest}
              disabled={!canSend || loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-pink-400 px-4 py-3 text-sm font-extrabold text-zinc-950 shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"

            >
              {loading ? "Invio..." : "Invia al DJ"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Richieste inviate 
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
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-400/80">
  Nessun audio viene inviato — solo link e titolo.
</footer>

      </div>
    </div>
  );
}
