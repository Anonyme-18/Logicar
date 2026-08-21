import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { periodInput } from "./schemas";

/** KPI + série temporelle, entièrement recalculés côté serveur. */
export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => periodInput.parse(input))
  .handler(async ({ data, context }) => {
    const { buildDashboard } = await import("./dashboard.server");
    return buildDashboard(context.supabase, context.userId, data.from, data.to);
  });
