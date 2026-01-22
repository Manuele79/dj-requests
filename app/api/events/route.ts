import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function checkCreatePassword(provided: any) {
  const pass = String(provided || "").trim();
  if (!pass) return false;

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "create_event_password")
    .single();

  if (error || !data?.value) return false;
  return pass === String(data.value);
}

// GET /api/events?eventCode=XXXX  (serve per "entra evento esistente")
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventCode = normalizeEventCode(searchParams.get("eventCode"));

  if (!eventCode) {
    return NextResponse.json({ ok: false, error: "Bad Request" }, { status: 400 });
  }

  const { data: ev, error } = await supabase
    .from("events")
    .select("event_code, expires_at")
    .eq("event_code", eventCode)
    .single();

  if (error || !ev) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const exp = ev.expires_at ? Date.parse(ev.expires_at) : 0;
  if (exp && Date.now() > exp) {
    return NextResponse.json({ ok: false, error: "Expired" }, { status: 410 });
  }

  return NextResponse.json({ ok: true, eventCode: ev.event_code, expiresAt: ev.expires_at });
}

// POST /api/events  body: { eventCode, password }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const eventCode = normalizeEventCode(body.eventCode);
  const password = body.password;

  if (!eventCode) {
    return NextResponse.json({ ok: false, error: "Bad Request" }, { status: 400 });
  }

  const okPass = await checkCreatePassword(password);
  if (!okPass) {
    return NextResponse.json({ ok: false, error: "Password errata" }, { status: 401 });
  }

  // crea (o aggiorna) evento e resetta scadenza a 12 ore da ora
  const { data, error } = await supabase
    .from("events")
    .upsert(
      {
        event_code: eventCode,
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "event_code" }
    )
    .select("event_code, created_at, expires_at")
    .single();

  if (error) {
    console.error("SUPABASE CREATE EVENT ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: data });
}
