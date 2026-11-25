import { useEffect, useState } from "react";
import { Translated } from "./Translated";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playRing, requestNotifyPermission, systemNotify, unlockAudio } from "@/lib/alert";
import { t, useLang } from "@/lib/i18n";
import { subscribePush } from "@/lib/push-client";
import { notifyAdmins } from "@/lib/push.functions";
import { EditProfile } from "./EditProfile";
import { ShiftPanel, useNow, dur, fmtDateTime } from "./ShiftPanel";
import { Header, statusMeta, statusOrder, useOrders, type DriverStatus, type Order, type Profile } from "./shared";

export function DriverView({ me, onChange }: { me: Profile; onChange: () => void }) {
  useLang();
  const now = useNow();
  const [incoming, setIncoming] = useState<Order | null>(null);
  useEffect(() => {
    // Keep this phone's push subscription fresh if alerts were already allowed.
    void subscribePush(me.id).catch(() => {});
  }, [me.id]);
  const { orders, reload } = useOrders((o) => {
    if (o.status !== "open" || (me.status !== "available" && me.status !== "busy")) return;
    setIncoming(o);
    playRing();
    systemNotify("Neuer Auftrag – Hilfe benötigt!", o.details);
  });

  const setStatus = async (status: DriverStatus) => {
    unlockAudio();
    await supabase.from("profiles").update({ status, updated_at: new Date().toISOString() }).eq("id", me.id);
    onChange();
  };

  const accept = async (id: string) => {
    const { data, error } = await supabase.rpc("accept_order", { _order_id: id });
    setIncoming(null);
    if (error) { toast.error(error.message); return; }
    if (data) { toast.success(t("yours")); void notifyAdmins({ data: { orderId: id, event: "accepted" } }).catch(console.error); }
    else toast.error(t("taken"));
    onChange();
    void reload();
  };

  const complete = async (id: string) => {
    const { error } = await supabase.rpc("complete_order", { _order_id: id });
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").update({ status: "available", updated_at: new Date().toISOString() }).eq("id", me.id);
    toast.success(t("doneMsg"));
    void notifyAdmins({ data: { orderId: id, event: "done" } }).catch(console.error);
    onChange();
    void reload();
  };

  const enableAlerts = async () => {
    unlockAudio();
    const r = await requestNotifyPermission();
    if (r === "granted") {
      const ok = await subscribePush(me.id).catch(() => false);
      if (ok) toast.success(t("alertsOn"));
      else toast.info(t("alertsOpenOnly"));
    }
    else if (r === "open-in-new-tab") toast.info(t("newTab"));
    else if (r === "unsupported") toast.info(t("iphoneHint"));
    else toast.error(t("blocked"));
  };

  const open = orders.filter((o) => o.status === "open");
  const mine = orders.filter((o) => o.status === "accepted" && o.accepted_by === me.id);

  return (
    <main className="mx-auto max-w-lg px-5 pb-16" onClick={unlockAudio}>
      <Header title={me.display_name || t("driver")} subtitle={t("staplaDriver")} />

      <ShiftPanel userId={me.id} status={me.status} />

      <section className="rounded-3xl bg-card p-2">
        <div className="grid grid-cols-2 gap-2">
          {statusOrder.map((s) => {
            const active = me.status === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex flex-col items-center gap-2 rounded-2xl py-4 text-sm font-semibold transition ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className={`size-3 rounded-full ${statusMeta[s].dot} ${active ? "" : "opacity-40"}`} />
                {t(statusMeta[s].label)}
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={enableAlerts} className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
        <BellRing className="size-4" /> {t("enableAlerts")}
      </button>

      <EditProfile me={me} onChange={onChange} />

      {mine.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-2xl font-bold uppercase">{t("yourOrders")}</h2>
          {mine.map((o) => (
            <div key={o.id} className="mb-3 rounded-2xl border border-success/40 bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("sentAt", { d: fmtDateTime(o.created_at) })}</p>
              {o.accepted_at && <p className="text-sm text-muted-foreground">{t("tookFor")}: {dur(new Date(o.accepted_at).getTime() - new Date(o.created_at).getTime())}</p>}
              <p className="mt-2 whitespace-pre-wrap"><Translated text={o.details} /></p>
              <button onClick={() => complete(o.id)} className="mt-4 h-12 w-full rounded-xl bg-success font-semibold text-success-foreground">
                {t("markDone")}
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-2xl font-bold uppercase">{t("openCalls")}</h2>
        {open.length === 0 && <p className="text-muted-foreground">{t("noCalls")}</p>}
        {open.map((o) => (
          <div key={o.id} className="mb-3 rounded-2xl bg-card p-4">
            <p className="text-sm text-muted-foreground">{t("sentAt", { d: fmtDateTime(o.created_at) })}</p>
            <p className="text-sm font-semibold text-primary tabular-nums">{t("waitingFor")}: {dur(now - new Date(o.created_at).getTime())}</p>
            <p className="mt-1 whitespace-pre-wrap"><Translated text={o.details} /></p>
            <button onClick={() => accept(o.id)} className="mt-4 h-12 w-full rounded-xl bg-signal font-semibold text-primary-foreground">
              {t("accept")}
            </button>
          </div>
        ))}
      </section>

      {incoming && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur">
          <div className="animate-ring flex size-28 items-center justify-center rounded-full bg-signal">
            <BellRing className="size-12 text-primary-foreground" />
          </div>
          <h2 className="mt-8 text-5xl font-bold uppercase">{t("helpNeeded")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("sentAt", { d: fmtDateTime(incoming.created_at) })} · {t("waitingFor")}: {dur(now - new Date(incoming.created_at).getTime())}</p>
          <p className="mt-4 max-w-sm whitespace-pre-wrap text-center text-lg"><Translated text={incoming.details} /></p>
          <button onClick={() => accept(incoming.id)} className="mt-10 h-16 w-full max-w-sm rounded-2xl bg-signal text-xl font-bold uppercase text-primary-foreground shadow-signal">
            {t("acceptOrder")}
          </button>
          <button onClick={() => setIncoming(null)} className="mt-4 py-3 text-muted-foreground">
            {t("notNow")}
          </button>
        </div>
      )}
    </main>
  );
}
