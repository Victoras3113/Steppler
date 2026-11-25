import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, useLang, pwOk } from "@/lib/i18n";
import { setDriverPassword } from "@/lib/drivers.functions";

export function DriverPassword({ userId }: { userId: string }) {
  useLang();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!pwOk(pw)) { toast.error(t("pwRule")); return; }
    setBusy(true);
    try { await setDriverPassword({ data: { userId, password: pw } }); toast.success(t("pwSet")); setPw(""); }
    catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="mt-3 space-y-2 rounded-2xl border p-3">
      <p className="text-sm font-semibold">{t("setDriverPw")}</p>
      <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("newPassword")} className="h-11" autoComplete="off" />
      <p className="text-xs text-muted-foreground">{t("pwRule")}</p>
      <Button onClick={save} disabled={busy || !pw} variant="secondary" className="h-10 w-full">{t("savePassword")}</Button>
    </div>
  );
}
