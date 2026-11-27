import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { t, useLang, getLang } from "@/lib/i18n";
import { statusMeta, statusOrder, type DriverStatus } from "./shared";

type Ev = { status: DriverStatus; started_at: string };

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return now;
}

export function dur(msv: number) {
  const s = Math.max(0, Math.floor(msv / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function fmtDateTime(d: Date | number | string) {
  const loc = ({ en: "en-GB", de: "de-DE", pl: "pl-PL", ro: "ro-RO" } as const)[getLang()];
  return new Date(d).toLocaleString(loc, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Shift panel: live clock, time on duty today (resets at 00:00), time in the current status and today's time per status.
export function ShiftPanel({ userId, status }: { userId: string; status: DriverStatus }) {
  useLang();
  const now = useNow();
  const [evs, setEvs] = useState<Ev[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("status_events").select("status,started_at")
      .eq("user_id", userId).order("started_at", { ascending: false }).limit(300);
    setEvs((data ?? []) as Ev[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load, status]);

  // Everything counts from 00:00 today, so the clocks start again every night instead of running non-stop.
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const dayStart = midnight.getTime();
  const cur = evs[0];
  const curStart = Math.max(cur ? new Date(cur.started_at).getTime() : now, dayStart);

  const totals: Record<DriverStatus, number> = { available: 0, busy: 0, break: 0, off: 0 };
  let end = now;
  for (const e of evs) {
    const s = new Date(e.started_at).getTime();
    const from = Math.max(s, dayStart);
    if (end > from) totals[e.status] += end - from;
    end = s;
    if (s < dayStart) break;
  }
  const onDutyToday = statusOrder.reduce((a, st) => a + totals[st], 0);
  const sum = onDutyToday || 1;

  return (
    <section className="mb-4 rounded-3xl bg-card p-5">
      <p className="text-sm text-muted-foreground">{fmtDateTime(now)}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("onDutyToday")}</p>
          <p className={`font-display text-5xl font-bold tabular-nums ${statusMeta[status].text}`}>{dur(onDutyToday)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">{t("inStatus", { s: t(statusMeta[status].label) })}</p>
          <p className={`font-semibold tabular-nums ${statusMeta[status].text}`}>{dur(now - curStart)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("today")}</p>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-secondary">
        {statusOrder.map((s) => <div key={s} className={statusMeta[s].dot} style={{ width: `${(totals[s] / sum) * 100}%` }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {statusOrder.map((s) => (
          <li key={s} className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
            <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${statusMeta[s].dot}`} />{t(statusMeta[s].label)}</span>
            <span className="font-semibold tabular-nums">{dur(totals[s])}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
