import { useEffect, useState } from "react";
import { Translated } from "./Translated";
import { OrderPhotoGallery, deleteOrderWithPhotos } from "./OrderPhotos";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t, useLang, getLang } from "@/lib/i18n";

type O = { id: string; details: string; accepted_at: string | null; status: string };

// Admin-only: orders a driver processed today, plus a day-by-day history.
export function DriverOrders({ driverId }: { driverId: string }) {
  useLang();
  const [orders, setOrders] = useState<O[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [photosOf, setPhotosOf] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const removeOrder = async (id: string) => {
    setDeleting(true);
    try {
      await deleteOrderWithPhotos(id);
      setOrders((list) => list.filter((x) => x.id !== id));
      toast.success(t("orderDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setDeleting(false);
    setConfirmDel(null);
  };
  useEffect(() => {
    void supabase.from("orders").select("id,details,accepted_at,status")
      .eq("accepted_by", driverId).order("accepted_at", { ascending: false }).limit(500)
      .then(({ data }) => setOrders((data ?? []) as O[]));
  }, [driverId]);

  const loc = ({ en: "en-GB", de: "de-DE", pl: "pl-PL", ro: "ro-RO" } as const)[getLang()];
  const dayKey = (iso: string) => new Date(iso).toLocaleDateString(loc, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const todayKey = dayKey(new Date().toISOString());
  const groups = new Map<string, O[]>();
  for (const o of orders) {
    if (!o.accepted_at) continue;
    const k = dayKey(o.accepted_at);
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const today = groups.get(todayKey) ?? [];
  const past = [...groups.entries()].filter(([k]) => k !== todayKey);

  const row = (o: O) => (
    <li key={o.id} className="rounded-xl bg-background px-3 py-2 text-sm">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{new Date(o.accepted_at!).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</span>
        <span>{o.status === "done" ? t("done") : t("inProgress")}</span>
      </div>
      <p className="mt-1 line-clamp-2"><Translated text={o.details} /></p>
      <div className="mt-1 flex items-center justify-between">
        <button type="button" onClick={() => setPhotosOf(photosOf === o.id ? null : o.id)} className="text-xs font-semibold text-primary">
          📷 {photosOf === o.id ? t("hide") : t("photos")}
        </button>
        <button type="button" onClick={() => setConfirmDel(o.id)} className="flex items-center gap-1 text-xs font-semibold text-destructive">
          <Trash2 className="size-3.5" /> {t("deleteOrder")}
        </button>
      </div>
      {confirmDel === o.id && (
        <div className="mt-2 rounded-lg border border-destructive/40 p-2">
          <p className="text-xs">{t("confirmDeleteOrder")}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={deleting} onClick={() => removeOrder(o.id)}
              className="h-9 flex-1 rounded-lg bg-destructive text-xs font-semibold text-white disabled:opacity-50">{t("deleteOrder")}</button>
            <button type="button" onClick={() => setConfirmDel(null)} className="h-9 flex-1 rounded-lg border text-xs font-semibold">{t("cancel")}</button>
          </div>
        </div>
      )}
      {photosOf === o.id && <OrderPhotoGallery orderId={o.id} label={(o.accepted_at ?? "").slice(0, 16).replace("T", "_").replace(":", "-")} />}
    </li>
  );

  return (
    <section className="mb-2 rounded-3xl bg-card p-5">
      <div className="flex items-end justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("ordersToday")}</p>
        <p className="font-display text-4xl font-bold text-primary">{today.length}</p>
      </div>
      {today.length > 0 && (
        <details className="group mt-3 rounded-xl border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold">
            <span>{todayKey}</span>
            <span className="flex items-center gap-2 text-muted-foreground">{t("ordersCount", { n: today.length })}<span className="transition-transform group-open:rotate-180">▾</span></span>
          </summary>
          <ul className="space-y-2 px-2 pb-2">{today.map(row)}</ul>
        </details>
      )}
      <button onClick={() => setShowHistory(!showHistory)} className="mt-4 h-10 w-full rounded-xl border text-sm font-semibold text-primary">
        {showHistory ? t("hideHistory") : t("history")}
      </button>
      {showHistory && (
        <div className="mt-3 space-y-2">
          {past.length === 0 && <p className="text-sm text-muted-foreground">{t("noHistory")}</p>}
          {past.map(([day, list]) => (
            <details key={day} className="group rounded-xl border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold">
                <span>{day}</span>
                <span className="flex items-center gap-2 text-muted-foreground">{t("ordersCount", { n: list.length })}<span className="transition-transform group-open:rotate-180">▾</span></span>
              </summary>
              <ul className="space-y-2 px-2 pb-2">{list.map(row)}</ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
