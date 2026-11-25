import { useEffect, useRef, useState } from "react";
import { playRing, requestNotifyPermission, systemNotify, unlockAudio } from "@/lib/alert";
import { subscribePush } from "@/lib/push-client";
import { Translated } from "./Translated";
import { toast } from "sonner";
import { BellRing, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyDrivers } from "@/lib/push.functions";
import { t, useLang } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";
import { Header, statusMeta, timeAgo, useOrders, useProfiles, type Profile } from "./shared";
import { AdminRequests } from "./AdminRequests";
import { ShiftPanel } from "./ShiftPanel";
import { DriverOrders } from "./DriverOrders";
import { CustomersCard, useCustomers } from "./Customers";
import { DriverPassword } from "./DriverPassword";

// Notifications to drivers are always German.
const customerText = (name: string) =>
  `Auftrag von ${name} ist am Haupttor angekommen. Bitte melden Sie sich, um bei der Bearbeitung des Auftrags zu helfen.`;

export function AdminView({ me }: { me: Profile }) {
  useLang();
  const profiles = useProfiles();
  const { orders, reload } = useOrders();
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [openDriver, setOpenDriver] = useState<string | null>(null);
  const { customers, reload: reloadCustomers } = useCustomers();

  const [adminIds, setAdminIds] = useState<string[] | null>(null);
  useEffect(() => {
    void supabase.rpc("list_admin_ids").then(({ data }) => setAdminIds((data as string[] | null) ?? []));
  }, [profiles.length]);
  const drivers = adminIds ? profiles.filter((p) => !adminIds.includes(p.id)) : [];
  const admins = profiles.filter((p) => adminIds?.includes(p.id));
  const available = drivers.filter((d) => d.status === "available").length;
  const nameOf = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? "—";

  // Alert admin when a driver starts or finishes an order.
  const prev = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const m = new Map(orders.map((o) => [o.id, o.status as string]));
    if (prev.current) {
      for (const o of orders) {
        const before = prev.current.get(o.id);
        if (!before || before === o.status) continue;
        const name = nameOf(o.accepted_by);
        const msg = o.status === "accepted" ? t("evAccepted", { name }) : o.status === "done" ? t("evDone", { name }) : null;
        if (!msg) continue;
        toast.success(msg, { duration: 8000 });
        playRing();
        systemNotify(o.status === "accepted" ? `${name} bearbeitet jetzt den Auftrag` : `${name} hat den Auftrag erledigt`, o.details);
      }
    }
    prev.current = m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
  // In-app: alert once per order left open 30+ minutes.
  const overdueSeen = useRef(new Set<string>());
  useEffect(() => {
    const check = () => {
      for (const o of orders) {
        if (o.status !== "open" || Date.now() - new Date(o.created_at).getTime() < 30 * 60 * 1000 || overdueSeen.current.has(o.id)) continue;
        overdueSeen.current.add(o.id);
        toast.error(t("evOverdue"), { description: o.details, duration: 15000 });
        playRing();
        systemNotify("Auftrag seit 30 Minuten nicht angenommen!", o.details);
      }
    };
    check();
    const i = setInterval(check, 15000);
    return () => clearInterval(i);
  }, [orders]);
  useEffect(() => { void subscribePush(me.id).catch(() => {}); }, [me.id]);
  const enableAlerts = async () => {
    unlockAudio();
    const r = await requestNotifyPermission();
    if (r === "granted") { const ok = await subscribePush(me.id).catch(() => false); toast[ok ? "success" : "info"](t(ok ? "alertsOn" : "alertsOpenOnly")); }
    else if (r === "open-in-new-tab") toast.info(t("newTab"));
    else if (r === "unsupported") toast.info(t("iphoneHint"));
    else toast.error(t("blocked"));
  };

  const callAll = async () => {
    if (!details.trim()) { toast.error(t("addDetails")); return; }
    setSending(true);
    const { data: created, error } = await supabase
      .from("orders")
      .insert({ details: details.trim(), created_by: me.id })
      .select("id")
      .single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setDetails("");
    toast.success(t("calling", { n: drivers.length }));
    try {
      const r = await notifyDrivers({ data: { orderId: created.id } });
      toast.success(t("pushSent", { n: r.sent }));
    } catch (e) {
      console.error(e);
      toast.error(t("pushFail"));
    }
  };

  const cancel = async (id: string) => {
    await supabase.from("orders").delete().eq("id", id);
    void reload();
  };

  const active = orders.filter((o) => o.status !== "done");

  return (
    <main className="mx-auto max-w-lg px-5 pb-16" onClick={unlockAudio}>
      <Header title={t("dispatch")} subtitle={t("administrator")} />

      <section className="rounded-3xl bg-card p-5">
        <h2 className="text-2xl font-bold uppercase">{t("newOrder")}</h2>
        {customers.length > 0 && (
          <select
            value=""
            onChange={(e) => { const c = customers.find((x) => x.id === e.target.value); if (c) setDetails(customerText(c.name)); }}
            className="mt-3 h-11 w-full rounded-xl border bg-background px-3 text-base"
          >
            <option value="">{t("pickCustomer")}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t("detailsPh")}
          className="mt-3 min-h-24 text-base"
        />
        <button
          onClick={callAll}
          disabled={sending}
          className="mt-4 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-signal font-display text-xl font-bold uppercase text-primary-foreground shadow-signal transition active:scale-[0.98] disabled:opacity-60"
        >
          <Megaphone className="size-6" /> {t("callAll")}
        </button>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          <span className="font-semibold text-success">{available}</span> {t("availableNow", { n: drivers.length })}
        </p>
      </section>

      <button onClick={enableAlerts} className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
        <BellRing className="size-4" /> {t("enableAlerts")}
      </button>

      <AdminRequests meId={me.id} />

      <CustomersCard meId={me.id} customers={customers} reload={reloadCustomers} />

      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-bold uppercase">{t("drivers")}</h2>
        {drivers.length === 0 && <p className="text-muted-foreground">{t("noDrivers")}</p>}
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
          {drivers.map((d) => {
            const m = statusMeta[d.status];
            return (
              <li key={d.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`size-2.5 rounded-full ${m.dot}`} />
                    <span className="font-medium">{d.display_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${m.text}`}>{t(m.label)}</span>
                    <button onClick={() => setOpenDriver(openDriver === d.id ? null : d.id)} className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-primary">
                      {openDriver === d.id ? t("hide") : t("details")}
                    </button>
                  </div>
                </div>
                {openDriver === d.id && <div className="mt-3"><ShiftPanel userId={d.id} status={d.status} /><DriverOrders driverId={d.id} /><DriverPassword userId={d.id} /></div>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-bold uppercase">{t("adminAccounts")}</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
          {admins.map((a) => (
            <li key={a.id} className="px-4 py-3.5 font-medium">{a.display_name}{a.id === me.id ? " ✓" : ""}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-bold uppercase">{t("activeOrders")}</h2>
        {active.length === 0 && <p className="text-muted-foreground">{t("noActive")}</p>}
        <div className="space-y-3">
          {active.map((o) => (
            <div key={o.id} className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className={o.status === "open" ? "font-semibold text-primary" : "font-semibold text-success"}>
                  {o.status === "open" ? t("waitingDriver") : t("acceptedBy", { name: nameOf(o.accepted_by) })}
                </span>
                <span className="text-muted-foreground">{timeAgo(o.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap"><Translated text={o.details} /></p>
              <button onClick={() => cancel(o.id)} className="mt-3 text-sm text-destructive">
                {t("cancelOrder")}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
