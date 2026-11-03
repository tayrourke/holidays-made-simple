/* Holidays Made Simple — deliver one advent-door ping.
   Secrets (already on the Hearthkeep project): VAPID_PRIVATE_KEY, SUPABASE_URL, SERVICE_ROLE.
   Auth: x-push-secret must match hearthkeep_push_dispatch_secret.
   Sends only to guide_push_subscriptions, never to vault devices.
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
};

const VAPID_PUBLIC =
  Deno.env.get("VAPID_PUBLIC_KEY") ||
  "BGq9OXJblmOPDBxkzkZTXap19723u5TUNduuyHZug6-42mg31_E-cRaLLe79rqciqchU3eS81Hu33oWZJiYIyhs";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:taylor@livingsimplypure.com";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

type Payload = {
  event?: string;
  event_key?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });
  if (!VAPID_PRIVATE) return json(500, { error: "Push is not configured" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Missing Supabase env" });

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const offered = req.headers.get("x-push-secret") || "";
  const secretRes = await db.from("hearthkeep_push_dispatch_secret").select("secret").eq("id", 1).maybeSingle();
  const stored = String((secretRes.data && secretRes.data.secret) || "");
  if (secretRes.error || !sameSecret(offered, stored)) return json(401, { error: "Unauthorized" });

  let payload: Payload = {};
  try { payload = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  if (payload.event !== "guide" || !payload.event_key) return json(400, { error: "Missing guide payload" });

  const claimed = await db.from("guide_push_deliveries").insert({ event_key: payload.event_key });
  if (claimed.error) {
    if (claimed.error.code === "23505") return json(200, { ok: true, skipped: "duplicate" });
    console.error("guide-send-push claim:", claimed.error);
    return json(500, { error: "Could not claim event" });
  }

  const { data: subs, error: subErr } = await db
    .from("guide_push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (subErr) {
    console.error("guide-send-push subs:", subErr);
    return json(500, { error: "Could not load subscriptions" });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const message = JSON.stringify({
    title: String(payload.title || "Holidays Made Simple").slice(0, 120),
    body: String(payload.body || "a new door is open").slice(0, 180),
    url: String(payload.url || "./#advent").slice(0, 240),
    tag: String(payload.tag || payload.event_key).slice(0, 120),
  });

  let sent = 0;
  const gone: string[] = [];
  const list = subs || [];
  for (let i = 0; i < list.length; i += 25) {
    const slice = list.slice(i, i + 25);
    const results = await Promise.allSettled(
      slice.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
          { TTL: 60 * 60 * 12, urgency: "high" }
        )
      )
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") { sent += 1; return; }
      const reason = result.reason as { statusCode?: number };
      if (reason.statusCode === 404 || reason.statusCode === 410) gone.push(slice[idx].endpoint);
      else console.error("guide-send-push:", reason.statusCode);
    });
  }
  if (gone.length) await db.from("guide_push_subscriptions").delete().in("endpoint", gone);

  console.log("guide-send-push", payload.event_key, "sent", sent, "dropped", gone.length);
  return json(200, { ok: true, sent, dropped: gone.length });
});
