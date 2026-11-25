import { callFn } from "@/integrations/supabase/client";

export const getVapidPublicKey = () => callFn<{ publicKey: string }>("push", { action: "vapid" }).then((r) => r.publicKey);

// Admin -> available drivers: "new order" push.
export const notifyDrivers = ({ data }: { data: { orderId: string } }) =>
  callFn<{ sent: number }>("push", { action: "drivers", ...data });

// Driver -> all admins: order accepted / done push.
export const notifyAdmins = ({ data }: { data: { orderId: string; event: "accepted" | "done" } }) =>
  callFn<{ sent: number }>("push", { action: "admins", ...data });
