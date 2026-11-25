// Admin only: set a new password for a driver (never for another admin).
import { admin, cors, hasRole, json, pwOk, userIdFrom } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const me = await userIdFrom(req);
    if (!me || !(await hasRole(me, "admin"))) return json({ error: "forbidden" }, 403);
    const { userId, password } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(userId))) return json({ error: "bad_user" }, 400);
    if (!pwOk(String(password ?? ""))) return json({ error: "bad_password" }, 400);
    if (await hasRole(userId, "admin")) return json({ error: "forbidden" }, 403);
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
