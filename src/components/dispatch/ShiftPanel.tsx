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

// Gig-app style shift panel: live clock, time on duty / off duty, and today's time per status.
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

  const cur = evs[0];
  const curStart = cur ? new Date(cur.started_at).getTime() : now;
  // Find the start of the current online stretch (or offline stretch).
  let streakStart = curStart;
  let prevStretch: number | null = null;
  const online = status !== "off";
  for (let i = 0; i < evs.length; i++) {
    const isOn = evs[i]!.status !== "off";
    if (isOn !== online) {
      const end = streakStart;
      let j = i; let start = new Date(evs[i]!.started_at).getTime();
      while (j + 1 < evs.length && (evs[j + 1]!.status !== "off") === isOn) { j++; start = new Date(evs[j]!.started_at).getTime(); }
      prevStretch = end - start;
      break;
    }
    streakStart = new Date(evs[i]!.started_at).getTime();
  }

  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const totals: Record<DriverStatus, number> = { available: 0, busy: 0, break: 0, off: 0 };
  let end = now;
  for (const e of evs) {
    const s = new Date(e.started_at).getTime();
    const from = Math.max(s, midnight.getTime());
    if (end > from) totals[e.status] += end - from;
    end = s;
    if (s < midnight.getTime()) break;
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;

  return (
    <section className="mb-4 rounded-3xl bg-card p-5">
      <p className="text-sm text-muted-foreground">{fmtDateTime(now)}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{online ? t("onDutyFor") : t("offDutyFor")}</p>
          <p className={`font-display text-5xl font-bold tabular-nums ${statusMeta[status].text}`}>{dur(now - streakStart)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">{t("inStatus", { s: t(statusMeta[status].label) })}</p>
          <p className={`font-semibold tabular-nums ${statusMeta[status].text}`}>{dur(now - curStart)}</p>
        </div>
      </div>
      {prevStretch !== null && (
        <p className="mt-2 text-sm text-muted-foreground">{online ? t("wasOffFor") : t("wasOnFor")}: <span className="font-semibold tabular-nums text-foreground">{dur(prevStretch)}</span></p>
      )}
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
