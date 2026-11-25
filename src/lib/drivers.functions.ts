import { callFn } from "@/integrations/supabase/client";

export const DRIVER_DOMAIN = "drivers.seppeler.app";
export const normUser = (u: string) => u.trim().toLowerCase();
export const userOk = (u: string) => /^[a-z0-9._-]{3,30}$/.test(normUser(u));
export const driverEmail = (u: string) => `${normUser(u)}@${DRIVER_DOMAIN}`;

// Public: creates a confirmed driver account (no email needed). Runs in supabase/functions/signup-driver.
export const signupDriver = ({ data }: { data: { username: string; password: string; name: string } }) =>
  callFn<{ ok: boolean; taken: boolean }>("signup-driver", data);

// Admin only: set a new password for a driver. Runs in supabase/functions/set-driver-password.
export const setDriverPassword = ({ data }: { data: { userId: string; password: string } }) =>
  callFn<{ ok: boolean }>("set-driver-password", data);
