// Push alerts (always German):
//   action "vapid"   -> public key so phones can subscribe
//   action "drivers" -> admin created an order: alert available/busy drivers
//   action "admins"  -> driver accepted / finished an order: alert all admins
import { admin, adminIds, cors, hasRole, json, pushTo, userIdFrom, vapidKeys } from "../_shared/util.ts";

const uuid = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const d = await req.json();
    if (d.action === "vapid") return json({ publicKey: (await vapidKeys()).publicKey });

    const me = await userIdFrom(req);
    if (!me) return json({ error: "not signed in" }, 401);
    if (!uuid.test(String(d.orderId))) return json({ error: "bad order" }, 400);

    if (d.action === "drivers") {
      if (!(await hasRole(me, "admin"))) return json({ error: "Not allowed" }, 403);
      const { data: order } = await admin.from("orders").select("id, details").eq("id", d.orderId).single();
      if (!order) return json({ sent: 0 });
      const { data: drivers } = await admin.from("user_roles").select("user_id").eq("role", "driver");
      const driverIds = (drivers ?? []).map((x) => x.user_id);
      if (!driverIds.length) return json({ sent: 0 });
      const { data: avail } = await admin.from("profiles").select("id").in("status", ["available", "busy"]).in("id", driverIds);
      const sent = await pushTo((avail ?? []).map((p) => p.id), {
        title: "Neuer Auftrag – Hilfe benötigt!",
        body: order.details,
        orderId: order.id,
      });
      return json({ sent });
    }

    if (d.action === "admins") {
      if (d.event !== "accepted" && d.event !== "done") return json({ error: "bad event" }, 400);
      // Send each event only once per order, and only if the order really is in that state.
      const col = d.event === "accepted" ? "notified_accepted_at" : "notified_done_at";
      const { data: order } = await admin.from("orders")
        .update({ [col]: new Date().toISOString() })
        .eq("id", d.orderId).eq("accepted_by", me).eq("status", d.event).is(col, null)
        .select("id, details").maybeSingle();
      if (!order) return json({ sent: 0 });
      const { data: p } = await admin.from("profiles").select("display_name").eq("id", me).single();
      const name = p?.display_name || "Fahrer";
      const sent = await pushTo(await adminIds(), {
        title: d.event === "accepted" ? `${name} bearbeitet jetzt den Auftrag` : `${name} hat den Auftrag erledigt`,
        body: order.details,
        orderId: `${order.id}-${d.event}`,
      });
      return json({ sent });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
