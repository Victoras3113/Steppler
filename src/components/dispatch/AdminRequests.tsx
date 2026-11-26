import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { t, useLang } from "@/lib/i18n";

type Req = { user_id: string; display_name: string; email: string; requested_role: "admin" | "driver" };

// New accounts waiting for approval. The database decides who sees and decides what:
// driver requests -> any administrator; administrator requests -> only the main account. Declining deletes the account.
export function AdminRequests({ meId }: { meId: string }) {
  useLang();
  const [reqs, setReqs] = useState<Req[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("admin_requests").select("user_id,display_name,email,requested_role").neq("user_id", meId).order("created_at");
    setReqs((data ?? []) as Req[]);
  }, [meId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("decide_admin_request", { _user_id: id, _approve: approve });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? t("approved") : t("declined"));
    void load();
  };

  if (reqs.length === 0) return null;
  return (
    <section className="mt-8 rounded-3xl border border-primary/30 bg-card p-5">
      <h2 className="text-2xl font-bold uppercase">{t("adminRequests")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("declineInfo")}</p>
      <ul className="mt-3 space-y-3">
        {reqs.map((r) => (
          <li key={r.user_id} className="rounded-2xl bg-background p-4">
            <p className="font-semibold">{r.display_name}
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{r.requested_role === "admin" ? t("roleAdminReq") : t("roleDriverReq")}</span>
            </p>
            <p className="text-sm text-muted-foreground">{r.email.endsWith("@drivers.seppeler.app") ? r.email.split("@")[0] : r.email}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => decide(r.user_id, true)} className="h-10 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground">{t("approve")}</button>
              <button onClick={() => decide(r.user_id, false)} className="h-10 flex-1 rounded-xl border font-semibold">{t("decline")}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
