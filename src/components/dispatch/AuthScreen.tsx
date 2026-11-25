import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, useLang, LangSwitch, pwOk } from "@/lib/i18n";
import { signupDriver, driverEmail, userOk } from "@/lib/drivers.functions";
import logo from "@/assets/logo-seppeler.svg";

type Mode = "in" | "driver" | "admin";

export function AuthScreen() {
  useLang();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const id = email.trim();
      const login = id.includes("@") ? id : driverEmail(id);
      const { error } = await supabase.auth.signInWithPassword({ email: login, password });
      if (error) toast.error(error.message);
    } else if (mode === "driver") {
      if (!userOk(email)) { toast.error(t("userRule")); setBusy(false); return; }
      if (!pwOk(password)) { toast.error(t("pwRule")); setBusy(false); return; }
      try {
        const r = await signupDriver({ data: { username: email, password, name } });
        if (!r.ok) toast.error(r.taken ? t("userTaken") : "Error");
        else {
          const { error } = await supabase.auth.signInWithPassword({ email: driverEmail(email), password });
          if (error) toast.error(error.message);
        }
      } catch (err) { toast.error((err as Error).message); }
    } else {
      if (!pwOk(password)) { toast.error(t("pwRule")); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
          data: { display_name: name, requested_role: mode },
        },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success(t("checkConfirm"));
      if (!error) toast.info(t("adminApprovalInfo"));
    }
    setBusy(false);
  };

  const tab = (m: Mode, label: string) => (
    <button type="button" onClick={() => setMode(m)}
      className={`h-10 flex-1 rounded-xl text-sm font-semibold transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
      {label}
    </button>
  );

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between"><img src={logo} alt="Seppeler" className="h-8 w-auto" /><LangSwitch /></div>
        <h1 className="text-4xl font-bold uppercase leading-none">Seppeler<br /><span className="text-primary">Gabelstapler-Disponent</span></h1>
        <p className="mt-3 text-muted-foreground">{t("tagline")}</p>
        <div className="mt-8 flex gap-1 rounded-2xl bg-card p-1">
          {tab("in", t("signIn"))}{tab("driver", t("driverSignup"))}{tab("admin", t("adminSignup"))}
        </div>
        {mode === "admin" && (
          <p className="mt-3 text-sm text-muted-foreground">{t("adminNote")}</p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode !== "in" && (
            <Input placeholder={t("yourName")} value={name} onChange={(e) => setName(e.target.value)} required className="h-12" />
          )}
          <Input type={mode === "admin" ? "email" : "text"} autoCapitalize="none" autoCorrect="off" placeholder={mode === "admin" ? t("email") : mode === "driver" ? t("username") : t("emailOrUser")} value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
          <Input type="password" placeholder={t("password")} minLength={mode === "in" ? 6 : 8} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12" />
          {mode === "driver" && <p className="text-xs text-muted-foreground">{t("userRule")}</p>}
          {mode !== "in" && <p className="text-xs text-muted-foreground">{t("pwRule")}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
            {mode === "in" ? t("signIn") : mode === "admin" ? t("requestAdmin") : t("createDriver")}
          </Button>
        </form>
        {mode === "in" && (
          <button
            type="button"
            onClick={async () => {
              if (!email.includes("@")) { toast.info(email ? t("forgotDriver") : t("enterEmail")); return; }
              const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL });
              if (error) toast.error(error.message);
              else toast.success(t("checkReset"));
            }}
            className="mt-4 w-full text-sm text-muted-foreground"
          >
            {t("forgot")}
          </button>
        )}
        {mode === "in" && <p className="mt-2 text-center text-xs text-muted-foreground">{t("forgotDriver")}</p>}
      </div>
    </main>
  );
}
