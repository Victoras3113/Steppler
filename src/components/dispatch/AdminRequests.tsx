import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { t, useLang } from "@/lib/i18n";

type Req = { user_id: string; display_name: string; email: string };

export function AdminRequests({ meId }: { meId: string }) {
  useLang();
  const [isOwner, setIsOwner] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);

  const load = useCallback(async () => {
    // Only the main (owner) account — the first account ever created — can approve new administrators.
    const { data: own } = await supabase.from("app_owner").select("user_id").eq("user_id", meId).maybeSingle();
    setIsOwner(!!own);
    if (!own) return;
    const { data } = await supabase.from("admin_requests").select("user_id,display_name,email").neq("user_id", meId).order("created_at");
    setReqs(data ?? []);
  }, [meId]);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("decide_admin_request", { _user_id: id, _approve: approve });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? t("approved") : t("declined"));
    void load();
  };

  if (!isOwner || reqs.length === 0) return null;
  return (
    <section className="mt-8 rounded-3xl border border-primary/30 bg-card p-5">
      <h2 className="text-2xl font-bold uppercase">{t("adminRequests")}</h2>
      <ul className="mt-3 space-y-3">
        {reqs.map((r) => (
          <li key={r.user_id} className="rounded-2xl bg-background p-4">
            <p className="font-semibold">{r.display_name}</p>
            <p className="text-sm text-muted-foreground">{r.email}</p>
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
