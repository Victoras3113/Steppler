import { callFn } from "@/integrations/supabase/client";

// Translates order details for display (supabase/functions/translate). Returns the original if no key is set.
export const translateText = ({ data }: { data: { text: string; lang: "de" | "en" | "pl" | "ro" } }) =>
  callFn<{ text: string }>("translate", data);
