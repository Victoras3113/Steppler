import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { t, useLang } from "@/lib/i18n";

export type Customer = { id: string; name: string };

export function useCustomers() {
  const [list, setList] = useState<Customer[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("customers").select("id,name").order("name");
    setList(data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { customers: list, reload: load };
}

// Admin-only list of regular customers used to prefill order details.
export function CustomersCard({ meId, customers, reload }: { meId: string; customers: Customer[]; reload: () => void }) {
  useLang();
  const [name, setName] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("customers").insert({ name: name.trim(), created_by: meId });
    if (error) { toast.error(error.message); return; }
    setName("");
    reload();
  };
  const remove = async (id: string) => {
    await supabase.from("customers").delete().eq("id", id);
    reload();
  };
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-2xl font-bold uppercase">{t("customers")}</h2>
      <form onSubmit={add} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("companyName")} className="h-11" />
        <button className="h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">{t("add")}</button>
      </form>
      {customers.length === 0 && <p className="mt-3 text-muted-foreground">{t("noCustomers")}</p>}
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-card">
        {customers.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{c.name}</span>
            <button onClick={() => remove(c.id)} aria-label={t("remove")} className="text-destructive"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
