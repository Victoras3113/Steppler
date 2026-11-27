// Called every minute by pg_cron (see supabase/cron.sql). Protected by the cron_secret value in app_secrets.
//  1. Alerts all admins once per order left open 30+ minutes (each order is marked before sending, so it never alerts twice).
//  2. Once a day (after 07:00 UTC) checks how much photo storage is used and alerts the main account when it is almost full.
//  3. When a driver comes back from a break, alerts them about orders that arrived during the break and are still open.
//  4. Every 10 minutes, reminds all available / processing drivers about each order that nobody has accepted yet.
import { admin, adminIds, appSecret, json, pushTo } from "../_shared/util.ts";

const BUCKET = "order-photos";
const STORAGE_LIMIT_MB = 1024; // Supabase free plan: 1 GB file storage
const ALERT_AT = 0.8; // alert from 80 % used

// Adds up the size of every photo (files are stored as <order id>/<timestamp>.jpg).
async function photoStorageBytes() {
  let total = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data: folders, error } = await admin.storage.from(BUCKET).list("", { limit: 1000, offset });
    if (error) throw error;
    for (const f of folders ?? []) {
      if (f.id) { total += Number(f.metadata?.size ?? 0); continue; } // a file at the top level
      const { data: files } = await admin.storage.from(BUCKET).list(f.name, { limit: 1000 });
      for (const x of files ?? []) total += Number(x.metadata?.size ?? 0);
    }
    if (!folders || folders.length < 1000) break;
  }
  return total;
}

async function dailyStorageCheck() {
  const now = new Date();
  if (now.getUTCHours() < 7) return;
  const today = now.toISOString().slice(0, 10);
  const { data: last } = await admin.from("app_secrets").select("value").eq("name", "storage_check_day").maybeSingle();
  if (last?.value === today) return;
  await admin.from("app_secrets").upsert({ name: "storage_check_day", value: today });

  const usedMb = Math.round((await photoStorageBytes()) / 1024 / 1024);
  await admin.from("app_secrets").upsert({ name: "storage_used_mb", value: String(usedMb) });
  if (usedMb < STORAGE_LIMIT_MB * ALERT_AT) return;

  const { data: owner } = await admin.from("app_owner").select("user_id");
  const pct = Math.round((usedMb / STORAGE_LIMIT_MB) * 100);
  await pushTo((owner ?? []).map((o) => o.user_id as string), {
    title: `Spațiul pentru poze e ${pct}% plin / Fotospeicher ${pct}% voll`,
    body: `${usedMb} MB din ${STORAGE_LIMIT_MB} MB folosiți. Șterge comenzi vechi sau mărește spațiul. / ${usedMb} von ${STORAGE_LIMIT_MB} MB belegt.`,
    orderId: `storage-${today}`,
  });
}

async function breakReturnAlerts() {
  const nowIso = new Date().toISOString();
  // Claim recent status changes once (so each return from a break is alerted only one time).
  const { data: evs } = await admin.from("status_events")
    .update({ return_checked_at: nowIso })
    .in("status", ["available", "busy"]).is("return_checked_at", null)
    .gt("started_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .select("id, user_id, started_at");
  for (const ev of evs ?? []) {
    const { data: prev } = await admin.from("status_events").select("status, started_at")
      .eq("user_id", ev.user_id).lt("started_at", ev.started_at)
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (prev?.status !== "break") continue;
    const { data: waiting } = await admin.from("orders").select("id, details")
      .eq("status", "open").gte("created_at", prev.started_at).lte("created_at", ev.started_at)
      .order("created_at", { ascending: true });
    if (!waiting?.length) continue;
    await pushTo([ev.user_id as string], {
      title: waiting.length === 1 ? "1 Auftrag wartet seit Ihrer Pause" : `${waiting.length} Aufträge warten seit Ihrer Pause`,
      body: waiting.map((o) => `• ${o.details}`).join("\n"),
      orderId: `break-return-${ev.id}`,
    });
  }
}

async function openOrderReminders() {
  const nowIso = new Date().toISOString();
  const due = new Date(Date.now() - 9.5 * 60 * 1000).toISOString(); // ~10 min, with a little slack for the 1-minute schedule
  // Claim the orders that are due, so each reminder is sent only once even if two runs overlap.
  const { data: orders } = await admin.from("orders")
    .update({ reminded_at: nowIso })
    .eq("status", "open").lte("created_at", due)
    .or(`reminded_at.is.null,reminded_at.lte.${due}`)
    .select("id, details, created_at");
  if (!orders?.length) return;
  const { data: drivers } = await admin.from("user_roles").select("user_id").eq("role", "driver");
  const ids = (drivers ?? []).map((d) => d.user_id as string);
  if (!ids.length) return;
  const { data: active } = await admin.from("profiles").select("id").in("status", ["available", "busy"]).in("id", ids);
  const targets = (active ?? []).map((p) => p.id as string);
  for (const o of orders) {
    const mins = Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000);
    await pushTo(targets, {
      title: `Erinnerung: Auftrag wartet seit ${mins} Min.`,
      body: o.details,
      orderId: `${o.id}-reminder`,
    });
  }
}

Deno.serve(async (req) => {
  const secret = await appSecret("cron_secret");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  try { await dailyStorageCheck(); } catch (e) { console.error("storage check failed", e); }
  try { await breakReturnAlerts(); } catch (e) { console.error("break return alerts failed", e); }
  try { await openOrderReminders(); } catch (e) { console.error("order reminders failed", e); }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: orders } = await admin
    .from("orders")
    .update({ overdue_alerted_at: new Date().toISOString() })
    .eq("status", "open").is("overdue_alerted_at", null).lt("created_at", cutoff)
    .select("id, details");
  if (!orders?.length) return json({ alerted: 0 });

  const ids = await adminIds();
  for (const o of orders) {
    await pushTo(ids, { title: "Auftrag seit 30 Minuten nicht angenommen!", body: o.details, orderId: `${o.id}-overdue` });
  }
  return json({ alerted: orders.length });
});
