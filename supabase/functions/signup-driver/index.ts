// Public: creates a confirmed driver account (no e-mail needed). Role is always driver.
import { admin, cors, json, pwOk } from "../_shared/util.ts";

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
