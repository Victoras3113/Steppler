// Main (owner) account only: permanently delete another admin or driver account.
// The main account itself can never be deleted here. Past orders are kept for history.
import { admin, cors, json, userIdFrom } from "../_shared/util.ts";

const isOwner = async (id: string) =>
  !!(await admin.from("app_owner").select("user_id").eq("user_id", id).maybeSingle()).data;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const me = await userIdFrom(req);
    if (!me || !(await isOwner(me))) return json({ error: "Only the main account can delete accounts" }, 403);

    const { userId } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(userId))) return json({ error: "bad_user" }, 400);
    if (userId === me || (await isOwner(userId))) return json({ error: "The main account cannot be deleted" }, 400);

    // Remove data that isn't linked to the login record (profiles and roles are removed automatically).
    await admin.from("push_subscriptions").delete().eq("user_id", userId);
    await admin.from("status_events").delete().eq("user_id", userId);
    await admin.from("admin_requests").delete().eq("user_id", userId);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
