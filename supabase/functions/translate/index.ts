// Translates order details (typed in German by the dispatcher) for drivers who use EN / PL / RO.
// - Uses DeepL if a deepl_api_key row exists in app_secrets (better quality, 500,000 characters/month free).
// - Otherwise uses MyMemory (free, no key needed).
// Every translation is stored in public.translations, so the same text is translated only once for all phones.
// If translation fails, the original text is returned.
import { admin, appSecret, cors, json, userIdFrom } from "../_shared/util.ts";

const deepl = { de: "DE", en: "EN-GB", pl: "PL", ro: "RO" } as const;
type Lang = keyof typeof deepl;

async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

// MyMemory accepts at most 500 bytes per request: split at sentence/line ends into small chunks.
function chunks(text: string, maxBytes = 450) {
  const enc = new TextEncoder();
  const parts = text.split(/(?<=[.!?;:\n])\s*/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    const next = cur ? `${cur} ${p}` : p;
    if (enc.encode(next).length <= maxBytes) { cur = next; continue; }
    if (cur) out.push(cur);
    if (enc.encode(p).length <= maxBytes) { cur = p; continue; }
    // A single very long sentence: cut it by words.
    cur = "";
    for (const w of p.split(" ")) {
      const n = cur ? `${cur} ${w}` : w;
      if (enc.encode(n).length > maxBytes && cur) { out.push(cur); cur = w; } else cur = n;
    }
  }
  if (cur) out.push(cur);
  return out;
}

async function viaDeepl(key: string, text: string, lang: Lang) {
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], target_lang: deepl[lang], preserve_formatting: true }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}`);
  const j = await res.json();
  const t = j.translations?.[0]?.text?.trim();
  if (!t) throw new Error("DeepL empty");
  return t as string;
}

async function viaMyMemory(text: string, lang: Lang) {
  const out: string[] = [];
  for (const c of chunks(text)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=de|${lang}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory ${res.status}`);
    const j = await res.json();
    const t: string | undefined = j?.responseData?.translatedText;
    if (Number(j?.responseStatus) !== 200 || !t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error("MyMemory refused");
    out.push(t.trim());
  }
  return out.join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { text, lang } = await req.json().catch(() => ({}));
  if (typeof text !== "string" || !text.trim() || text.length > 5000 || !(lang in deepl)) return json({ error: "bad input" }, 400);
  if (!(await userIdFrom(req))) return json({ error: "not signed in" }, 401);
  if (lang === "de") return json({ text });

  const key = await sha256(`${lang}|${text}`);
  const { data: hit } = await admin.from("translations").select("text").eq("key", key).maybeSingle();
  if (hit?.text) return json({ text: hit.text });

  try {
    const dk = await appSecret("deepl_api_key");
    const out = dk ? await viaDeepl(dk, text, lang as Lang) : await viaMyMemory(text, lang as Lang);
    await admin.from("translations").upsert({ key, text: out });
    return json({ text: out });
  } catch (e) {
    console.error("translate failed", e);
    return json({ text });
  }
});
