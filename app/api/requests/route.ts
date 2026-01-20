import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- SIMPLE IN-MEMORY RATE LIMIT (good as first shield on Vercel) ---
const _rl = (globalThis as any).__dj_rl || new Map<string, number>();
(globalThis as any).__dj_rl = _rl;

function getClientIp(req: Request) {
  // Vercel/Proxies
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0]?.trim();
  return ip || "unknown";
}

function rateLimitOr429(key: string, windowMs: number) {
  const now = Date.now();
  const last = _rl.get(key) || 0;
  if (now - last < windowMs) {
    const retryAfterSec = Math.ceil((windowMs - (now - last)) / 1000);
    return NextResponse.json(
      { ok: false, error: "Too Many Requests", retryAfterSec },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "Cache-Control": "no-store",
        },
      }
    );
  }
  _rl.set(key, now);
  return null;
}


function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabase = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

function normalizeEventCode(code: any) {
  return String(code || "").trim().toUpperCase();
}
function apiSecretOk(req: Request) {
  const secret = process.env.API_SECRET;
  if (!secret) return true;
  const got = req.headers.get("x-api-secret") || "";
  return got === secret;
}

function requireSecret(req: Request) {
  if (!apiSecretOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function extractYouTubeVideoId(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return u.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;

      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];

      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
  } catch {}
  return "";
}

function detectPlatform(urlStr: string) {
  const u = (urlStr || "").toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("spotify.com")) return "spotify";
  if (u.includes("music.apple.com") || u.includes("itunes.apple.com")) return "apple";
  if (u.includes("music.amazon") || u.includes("amazon.")) return "amazon";
  return "other";
}

// ---- server-side title resolver (no CORS) ----
async function fetchJsonWithTimeout(url: string, ms = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,*/*",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function resolveTitleServer(title: string, url: string, platform: string) {
  const t = (title || "").trim();
  const u = (url || "").trim();
  if (!u) return t || "Richiesta";

  const looksGeneric =
    !t ||
    t.toLowerCase() === "richiesta" ||
    t.toLowerCase() === "richiesta youtube" ||
    t.toLowerCase() === "richiesta spotify" ||
    t.toLowerCase() === "richiesta apple music" ||
    t.toLowerCase() === "richiesta amazon music";

  if (!looksGeneric) return t;

  if (platform === "youtube") {
    const data = await fetchJsonWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`
    );
    const ot = data?.title ? String(data.title).trim() : "";
    return ot || "Richiesta YouTube";
  }

  if (platform === "spotify") {
    const data = await fetchJsonWithTimeout(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`
    );
    const ot = data?.title ? String(data.title).trim() : "";
    return ot || "Richiesta Spotify";
  }

  if (platform === "apple") return "Richiesta Apple Music";
  if (platform === "amazon") return "Richiesta Amazon Music";

  return "Richiesta";
}

// Mappa Supabase (snake_case) -> frontend (camelCase)
function mapRow(r: any) {
  return {
    id: String(r.id),
    eventCode: String(r.event_code ?? ""),
    title: String(r.title ?? ""),
    url: String(r.url ?? ""),
    platform: String(r.platform ?? "other"),
    youtubeVideoId: String(r.youtube_video_id ?? ""),
    votes: Number(r.votes ?? 0),
    createdAt: r.created_at ? Date.parse(r.created_at) : 0,
    updatedAt: Number(r.updated_at ?? 0),
  };
}

// GET /api/requests?eventCode=XXXX
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventCode = normalizeEventCode(searchParams.get("eventCode"));

  if (!eventCode) return NextResponse.json({ requests: [] });

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("event_code", eventCode)
    .gte("created_at", twelveHoursAgo)
    .order("votes", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("SUPABASE GET ERROR:", error);
    return NextResponse.json({ requests: [] }, { status: 500 });
  }

  return NextResponse.json({ requests: (data || []).map(mapRow) });
}

// POST /api/requests  body: { eventCode, title, url }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const eventCode = normalizeEventCode(body.eventCode);
  const title = String(body.title || "").trim();
  const url = String(body.url || body.youtubeUrl || "").trim();

  const ip = getClientIp(req);
  const denied = rateLimitOr429(`post:${ip}:${eventCode}`, 10000);
  if (denied) return denied;

  if (!eventCode || (!title && !url)) {
    return NextResponse.json({ ok: false, error: "Bad Request" }, { status: 400 });
  }

  // evento deve esistere ed essere non scaduto
  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("event_code, expires_at")
    .eq("event_code", eventCode)
    .single();

  if (evErr || !ev) {
    return NextResponse.json({ ok: false, error: "Evento non valido" }, { status: 404 });
  }

  const exp = ev.expires_at ? Date.parse(ev.expires_at) : 0;
  if (exp && Date.now() > exp) {
    return NextResponse.json({ ok: false, error: "Evento scaduto" }, { status: 410 });
  }

  const platform = detectPlatform(url);
  const youtubeVideoId = platform === "youtube" ? extractYouTubeVideoId(url) : "";
  const isPlaylist =
  (platform === "youtube" && url.includes("list=")) ||
  (platform === "spotify" && url.toLowerCase().includes("/playlist/"));

const safeTitle = isPlaylist
  ? (title || (platform === "youtube" ? "Playlist YouTube" : "Playlist Spotify"))
  : await resolveTitleServer(title, url, platform);

  const nowMs = Date.now();

  // MERGE: se stesso brano (youtubeVideoId) nello stesso evento -> +1 voto
  if (platform === "youtube" && youtubeVideoId) {
    const { data: existing } = await supabase
      .from("requests")
      .select("*")
      .eq("event_code", eventCode)
      .eq("platform", "youtube")
      .eq("youtube_video_id", youtubeVideoId)
      .limit(1);

    const row = existing?.[0];
    if (row) {
      const newVotes = Number(row.votes || 0) + 1;
      const { data: upd, error: e2 } = await supabase
        .from("requests")
        .update({ votes: newVotes, updated_at: nowMs, title: safeTitle })
        .eq("id", row.id)
        .select("*")
        .single();

      if (e2) {
        console.error("SUPABASE MERGE UPDATE ERROR:", e2);
        return NextResponse.json({ ok: false }, { status: 500 });
      }

      return NextResponse.json({ ok: true, merged: true, request: mapRow(upd) });
    }
  }

  // INSERT nuova richiesta
  const { data, error } = await supabase
    .from("requests")
    .insert({
      event_code: eventCode,
      title: safeTitle,
      url,
      platform,
      youtube_video_id: youtubeVideoId,
      votes: 1,
      updated_at: nowMs,
      // created_at: default now() in DB
    })
    .select("*")
    .single();

  if (error) {
    console.error("SUPABASE INSERT ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, merged: false, request: mapRow(data) });
}


// PATCH /api/requests  body: { id, delta?: number }
export async function PATCH(req: Request) {
  const denied = requireSecret(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({} as any));
  const id = String(body.id || "").trim();
  const delta = Number(body.delta ?? 1);



  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const { data: row, error: e1 } = await supabase
    .from("requests")
    .select("votes")
    .eq("id", id)
    .single();

  if (e1) {
    console.error("SUPABASE READ FOR VOTE ERROR:", e1);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const newVotes = Math.max(0, Number((row as any).votes || 0) + delta);
  const nowMs = Date.now();

  const { data, error: e2 } = await supabase
    .from("requests")
    .update({ votes: newVotes, updated_at: nowMs })
    .eq("id", id)
    .select("*")
    .single();

  if (e2) {
    console.error("SUPABASE VOTE UPDATE ERROR:", e2);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, request: mapRow(data) });
}
