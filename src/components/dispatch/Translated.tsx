import { useEffect, useState } from "react";
import { translateText } from "@/lib/translate.functions";
import { useLang } from "@/lib/i18n";

const cache = new Map<string, string>();

// Shows order details in the reader's language; German originals are shown as typed.
export function Translated({ text }: { text: string }) {
  const lang = useLang();
  const key = `${lang}|${text}`;
  const [out, setOut] = useState(cache.get(key) ?? text);
  useEffect(() => {
    if (lang === "de" || !text.trim()) { setOut(text); return; }
    const hit = cache.get(key);
    if (hit) { setOut(hit); return; }
    setOut(text);
    let alive = true;
    translateText({ data: { text, lang } })
      .then((r) => { cache.set(key, r.text); if (alive) setOut(r.text); })
      .catch(() => {});
    return () => { alive = false; };
  }, [key, lang, text]);
  return <>{out}</>;
}
