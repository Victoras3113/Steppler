// Called every minute by pg_cron (see supabase/schema.sql): alerts all admins once per order left open 30+ minutes.
// Protected by the CRON_SECRET secret. Each order is marked before sending, so it never alerts twice.
import { admin, adminIds, json, pushTo } from "../_shared/util.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);

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
