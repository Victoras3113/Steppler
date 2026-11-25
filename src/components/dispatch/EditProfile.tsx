import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, useLang, pwOk } from "@/lib/i18n";
import type { Profile } from "./shared";

export function EditProfile({ me, onChange }: { me: Profile; onChange: () => void }) {
  useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(me.display_name);
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const saveProfile = async () => {
    setBusy(true);
    const n = name.trim().slice(0, 100);
    if (n && n !== me.display_name) {
      const { error } = await supabase.from("profiles").update({ display_name: n }).eq("id", me.id);
      if (error) { toast.error(error.message); setBusy(false); return; }
    }
    toast.success(t("profileSaved"));
    setBusy(false);
    onChange();
  };

  const savePw = async () => {
    if (!pwOk(pw)) { toast.error(t("pwRule")); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(t("pwUpdated")); setPw(""); setCur(""); }
  };

  return (
    <section className="mt-3 rounded-3xl bg-card p-4">
      <button onClick={() => setOpen(!open)} className="w-full text-left text-sm font-semibold">
        {t("editProfile")} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourName")} maxLength={100} className="h-11" />
          <Button onClick={saveProfile} disabled={busy} className="h-11 w-full">{t("saveProfile")}</Button>
          <div className="border-t pt-3 space-y-3">
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder={t("currentPassword")} className="h-11" />
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("newPassword")} className="h-11" />
            <p className="text-xs text-muted-foreground">{t("pwRule")}</p>
            <Button onClick={savePw} disabled={busy || !pw} variant="secondary" className="h-11 w-full">{t("savePassword")}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
