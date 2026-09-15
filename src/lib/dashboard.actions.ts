"use server";

import { requireUser } from "@/lib/require-user";
import { periodInput } from "./schemas";
import { buildDashboard } from "./dashboard.server";

export async function getDashboardAction(data: { from: string; to: string }) {
  const parsed = periodInput.parse(data);
  const user = await requireUser();
  return buildDashboard(user.id, parsed.from, parsed.to);
}
