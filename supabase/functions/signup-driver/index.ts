// Public: creates a confirmed driver account (no e-mail needed). The account then waits for an admin's approval
// before it can see or accept orders (see handle_new_user / decide_admin_request in the database).
// Rate limited: max 5 sign-ups per IP per hour and 30 in total per hour.
import { admin, clientIp, cors, json, pwOk } from "../_shared/util.ts";

const DRIVER_DOMAIN = "drivers.seppeler.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const d = await req.json();
    const username = String(d.username ?? "").trim().toLowerCase();
    const password = String(d.password ?? "");
    const name = String(d.name ?? "").trim().slice(0, 100);
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return json({ error: "bad_username" }, 400);
    if (!pwOk(password)) return json({ error: "bad_password" }, 400);
    if (!name) return json({ error: "bad_name" }, 400);

    const ip = clientIp(req);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const [{ count: mine }, { count: all }] = await Promise.all([
      admin.from("signup_attempts").select("*", { count: "exact", head: true }).eq("ip", ip).gt("at", hourAgo),
      admin.from("signup_attempts").select("*", { count: "exact", head: true }).gt("at", hourAgo),
    ]);
    if ((mine ?? 0) >= 5 || (all ?? 0) >= 30) return json({ error: "Too many sign-ups, please try again later." }, 429);
    await admin.from("signup_attempts").insert({ ip });
    await admin.from("signup_attempts").delete().lt("at", new Date(Date.now() - 7 * 86400_000).toISOString());

    const { error } = await admin.auth.admin.createUser({
      email: `${username}@${DRIVER_DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, requested_role: "driver", username },
    });
    if (error) return json({ ok: false, taken: /already|exists|registered/i.test(error.message) });
    return json({ ok: true, taken: false });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
