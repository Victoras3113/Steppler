import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { t, LangSwitch, type Key } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type DriverStatus = Database["public"]["Enums"]["driver_status"];

export const statusOrder: DriverStatus[] = ["available", "busy", "break", "off"];

export const statusMeta: Record<DriverStatus, { label: Key; dot: string; text: string }> = {
  available: { label: "st_available", dot: "bg-success", text: "text-success" },
  busy: { label: "st_busy", dot: "bg-primary", text: "text-primary" },
  break: { label: "st_break", dot: "bg-warning", text: "text-warning" },
  off: { label: "st_off", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("display_name");
    setProfiles(data ?? []);
  }, []);
  useEffect(() => {
    void load();
    const ch = supabase
      .channel("profiles-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);
  return profiles;
}

export function useOrders(onInsert?: (o: Order) => void) {
  const [orders, setOrders] = useState<Order[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const cb = useRef(onInsert);
  cb.current = onInsert;
  const load = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    const list = data ?? [];
    // Detect new orders by comparing against what we've already seen (works for any detail length).
    if (seen.current) {
      for (const o of list) if (!seen.current.has(o.id) && o.status === "open") cb.current?.(o);
    }
    seen.current = new Set(list.map((o) => o.id));
    setOrders(list);
  }, []);
  useEffect(() => {
    void load();
    const ch = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .subscribe();
    const t = setInterval(() => void load(), 10000);
    return () => { clearInterval(t); void supabase.removeChannel(ch); };
  }, [load]);
  return { orders, reload: load };
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t("justNow");
  if (s < 3600) return t("minAgo", { n: Math.floor(s / 60) });
  return t("hAgo", { n: Math.floor(s / 3600) });
}

export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex items-end justify-between gap-4 pb-6 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{subtitle}</p>
        <h1 className="text-4xl font-bold uppercase leading-none">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <LangSwitch />
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground">
          {t("signOut")}
        </button>
      </div>
    </header>
  );
}
