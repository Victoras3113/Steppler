import { useCallback, useEffect, useRef, useState } from "react";
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

// Shifts (German time). Each forklift account is shared by an early and a late driver.
export const SHIFTS = [
  { key: "early", label: "shiftEarly", start: 5 * 60 + 30, end: 14 * 60 },
  { key: "late", label: "shiftLate", start: 14 * 60, end: 22 * 60 + 30 },
] as const;
const at = (day: Date, minutes: number) => { const d = new Date(day); d.setHours(0, minutes, 0, 0); return d.getTime(); };

export const BREAK_MAX_MS = 30 * 60 * 1000;

// Shift panel: live clock, time on duty in the current shift (starts again with each shift), time in the
// current status, today's time per status, and a summary of both shifts of the day.
export function ShiftPanel({ userId, status, onBreakOver }: { userId: string; status: DriverStatus; onBreakOver?: () => void }) {
  useLang();
  const now = useNow();
  const [evs, setEvs] = useState<Ev[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("status_events").select("status,started_at")
      .eq("user_id", userId).order("started_at", { ascending: false }).limit(300);
    setEvs((data ?? []) as Ev[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load, status]);

  const today = new Date(now);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const shift = SHIFTS.find((sh) => nowMin >= sh.start && nowMin < sh.end) ?? null;

  // Time per status inside [from, to), counting only working statuses.
  const totalsIn = (from: number, to: number) => {
    const tot: Record<DriverStatus, number> = { available: 0, busy: 0, break: 0, off: 0 };
    let end = Math.min(now, to);
    for (const e of evs) {
      const s = new Date(e.started_at).getTime();
      const a = Math.max(s, from);
      if (end > a) tot[e.status] += end - a;
      end = Math.min(end, s);
      if (s < from) break;
    }
    return tot;
  };
  const onDuty = (tot: Record<DriverStatus, number>) => statusOrder.reduce((a, st) => a + tot[st], 0);

  const shiftFrom = shift ? at(today, shift.start) : at(today, 0);
  const shiftTo = shift ? at(today, shift.end) : now;
  const totals = shift ? totalsIn(shiftFrom, shiftTo) : totalsIn(at(today, SHIFTS[0].start), at(today, SHIFTS[1].end));
  const onDutyNow = onDuty(totals);
  const perShift = SHIFTS.map((sh) => onDuty(totalsIn(at(today, sh.start), at(today, sh.end))));
  const sum = onDutyNow || 1;

  const cur = evs[0];
  const curStart = Math.max(cur ? new Date(cur.started_at).getTime() : now, shiftFrom);

  // Break countdown: a break lasts at most 30 minutes, then the driver is set back to "available".
  const breakStart = status === "break" && cur?.status === "break" ? new Date(cur.started_at).getTime() : null;
  const breakLeft = breakStart !== null ? BREAK_MAX_MS - (now - breakStart) : null;
  const ended = useRef<number | null>(null);
  useEffect(() => {
    if (breakLeft !== null && breakLeft <= 0 && onBreakOver && ended.current !== breakStart) {
      ended.current = breakStart;
      onBreakOver();
    }
  }, [breakLeft, breakStart, onBreakOver]);

  return (
    <section className="mb-4 rounded-3xl bg-card p-5">
      <p className="text-sm text-muted-foreground">{fmtDateTime(now)}</p>
      <p className="mt-1 text-sm font-semibold">{shift ? t(shift.label) : t("offHours")}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{shift ? t("thisShift") : t("todayTotal")}</p>
          <p className={`font-display text-5xl font-bold tabular-nums ${shift ? statusMeta[status].text : "text-muted-foreground"}`}>{dur(onDutyNow)}</p>
        </div>
        {shift && (
          <div className="text-right text-sm">
            <p className="text-muted-foreground">{t("inStatus", { s: t(statusMeta[status].label) })}</p>
            <p className={`font-semibold tabular-nums ${statusMeta[status].text}`}>{dur(now - curStart)}</p>
          </div>
        )}
      </div>
      {breakLeft !== null && (
        <p className={`mt-3 rounded-xl bg-background px-3 py-2 text-sm font-semibold ${statusMeta.break.text}`}>
          {t("breakEndsIn")} <span className="tabular-nums">{dur(Math.max(0, breakLeft)).replace(/^0:/, "")}</span>
        </p>
      )}
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
      <p className="mt-3 text-xs text-muted-foreground">
        {t("today")}: {t("shiftEarlyShort")} <span className="font-semibold tabular-nums text-foreground">{dur(perShift[0]!)}</span>
        {" · "}{t("shiftLateShort")} <span className="font-semibold tabular-nums text-foreground">{dur(perShift[1]!)}</span>
      </p>
    </section>
  );
}
