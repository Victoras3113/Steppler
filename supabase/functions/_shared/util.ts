// Shared helpers for the Edge Functions (replace the old Lovable server functions).
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildPushPayload } from "npm:@block65/webcrypto-web-push@2";
import { p256 } from "npm:@noble/curves@2/nist.js";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Service-role client: bypasses RLS, only ever used inside these functions.
export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Returns the signed-in user's id from the request's Authorization header, or null.
export async function userIdFrom(req: Request): Promise<string | null> {
  const token = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function hasRole(userId: string, role: "admin" | "driver") {
  const { data } = await admin.rpc("has_role", { _user_id: userId, _role: role });
  return !!data;
}

export const pwOk = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// VAPID keys derived from the VAPID_SEED secret — no third-party push account needed.
export async function vapidKeys() {
  const seed = Deno.env.get("VAPID_SEED");
  if (!seed) throw new Error("VAPID_SEED missing");
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const pub = p256.getPublicKey(d, false);
  return { subject: "mailto:dispatch@seppeler.de", publicKey: b64url(pub), privateKey: b64url(d) };
}

// Sends one push message to every saved subscription of the given users. Returns how many were delivered.
export async function pushTo(userIds: string[], msg: { title: string; body: string; orderId: string }) {
  if (!userIds.length) return 0;
  const { data: subs } = await admin.from("push_subscriptions").select("*").in("user_id", userIds);
  const vapid = await vapidKeys();
  const data = JSON.stringify({ ...msg, body: msg.body.slice(0, 1500) });
  let sent = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      const payload = await buildPushPayload(
        { data, options: { ttl: 600, urgency: "high" } },
        { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
        vapid,
      );
      const res = await fetch(s.endpoint, payload);
      if (res.status === 404 || res.status === 410) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      else if (res.ok) sent++;
      else console.error("push failed", res.status, await res.text());
    } catch (e) {
      console.error("push error", e);
    }
  }));
  return sent;
}

export async function adminIds() {
  const { data } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((a) => a.user_id as string);
}
