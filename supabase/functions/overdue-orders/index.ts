// Called every minute by pg_cron (see supabase/cron.sql). Protected by the cron_secret value in app_secrets.
//  1. Alerts all admins once per order left open 30+ minutes (each order is marked before sending, so it never alerts twice).
//  2. Once a day (after 07:00 UTC) checks how much photo storage is used and alerts the main account when it is almost full.
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

Deno.serve(async (req) => {
  const secret = await appSecret("cron_secret");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  try { await dailyStorageCheck(); } catch (e) { console.error("storage check failed", e); }

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
