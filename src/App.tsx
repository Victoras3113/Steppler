import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/dispatch/AuthScreen";
import { AdminView } from "@/components/dispatch/AdminView";
import { DriverView } from "@/components/dispatch/DriverView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, useLang, LangSwitch, pwOk } from "@/lib/i18n";
import type { Profile } from "@/components/dispatch/shared";

export function App() {
  useLang();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovering, setRecovering] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadMe = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return setMe(null);
    const [{ data: p, error: pe }, { data: r }, { data: q }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("admin_requests").select("user_id").eq("user_id", uid).maybeSingle(),
    ]);
    // A login saved on this phone for an account that was deleted: sign out instead of loading forever.
    if (!p && !pe) {
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !u.user) { await supabase.auth.signOut({ scope: "local" }); return; }
    }
    setMe(p);
    setIsAdmin(!!r?.some((x) => x.role === "admin"));
    setPending(!!q && !r?.length);
  }, [session?.user.id]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  if (recovering && session) return <ResetPassword onDone={() => setRecovering(false)} />;
  if (session === undefined) return <div className="min-h-dvh" />;
  if (!session) return <AuthScreen />;
  if (!me)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 text-muted-foreground">
        <p>{t("loading")}</p>
        <button onClick={() => supabase.auth.signOut({ scope: "local" })} className="text-sm underline">{t("signOut")}</button>
      </div>
    );
  if (pending)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <LangSwitch />
        <h1 className="text-4xl font-bold uppercase">{t("waiting")}</h1>
        <p className="text-muted-foreground">{t("waitingText")}</p>
        <div className="flex gap-2">
          <button onClick={() => void loadMe()} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">{t("checkAgain")}</button>
          <button onClick={() => supabase.auth.signOut()} className="h-11 rounded-xl border px-5 font-semibold">{t("signOut")}</button>
        </div>
      </main>
    );
  return isAdmin ? <AdminView me={me} /> : <DriverView me={me} onChange={loadMe} />;
}

// Shown after opening the "reset password" link from the e-mail.
function ResetPassword({ onDone }: { onDone: () => void }) {
  useLang();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwOk(password)) { toast.error(t("pwRule")); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("pwUpdated"));
    window.history.replaceState(null, "", import.meta.env.BASE_URL);
    onDone();
  };

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-3">
        <h1 className="text-4xl font-bold uppercase">{t("newPassword")}</h1>
        <Input type="password" placeholder={t("newPassword")} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12" />
        <p className="text-xs text-muted-foreground">{t("pwRule")}</p>
        <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">{t("savePassword")}</Button>
      </form>
    </main>
  );
}
