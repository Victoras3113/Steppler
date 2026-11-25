// Translates order details for drivers who use EN / PL / RO.
// Uses DeepL's free API (500,000 characters/month) when DEEPL_API_KEY is set; otherwise returns the original text.
import { cors, json, userIdFrom } from "../_shared/util.ts";

const target = { de: "DE", en: "EN-GB", pl: "PL", ro: "RO" } as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { text, lang } = await req.json().catch(() => ({}));
  if (typeof text !== "string" || !text.trim() || text.length > 5000 || !(lang in target)) return json({ error: "bad input" }, 400);
  if (!(await userIdFrom(req))) return json({ error: "not signed in" }, 401);

  const key = Deno.env.get("DEEPL_API_KEY");
  if (!key || lang === "de") return json({ text });
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  try {
    const res = await fetch(`https://${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text], target_lang: target[lang as keyof typeof target], preserve_formatting: true }),
    });
    if (!res.ok) return json({ text });
    const j = await res.json();
    return json({ text: j.translations?.[0]?.text?.trim() || text });
  } catch {
    return json({ text });
  }
});
