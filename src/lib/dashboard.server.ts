import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { toCents, fromCents } from "./money";

const PENDING = ["UNPAID", "PARTIALLY_PAID", "OVERDUE"];

const MONTH_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export async function buildDashboard(
  supabase: SupabaseClient<Database>,
  userId: string,
  from: string,
  to: string,
) {
  const [{ data: profile }, { data: invoices, error }, { data: quotes }] = await Promise.all([
    supabase.from("artisan_profiles").select("currency").eq("user_id", userId).maybeSingle(),
    supabase
      .from("invoices")
      .select("total, status, issue_date, paid_at")
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date"),
    supabase
      .from("quotes")
      .select("total, status, issue_date")
      .gte("issue_date", from)
      .lte("issue_date", to),
  ]);
  if (error) throw new Error(error.message);

  const rows = (invoices ?? []).filter((i) => i.status !== "CANCELLED");

  let billed = 0;
  let collected = 0;
  let pending = 0;
  const buckets = new Map<string, { billed: number; collected: number }>();

  for (const inv of rows) {
    const cents = toCents(Number(inv.total));
    billed += cents;
    if (inv.status === "PAID") collected += cents;
    if (PENDING.includes(inv.status)) pending += cents;

    const key = inv.issue_date.slice(0, 7);
    const bucket = buckets.get(key) ?? { billed: 0, collected: 0 };
    bucket.billed += cents;
    if (inv.status === "PAID") bucket.collected += cents;
    buckets.set(key, bucket);
  }

  const series = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: `${MONTH_SHORT[(month ?? 1) - 1]} ${String(year).slice(2)}`,
        billed: fromCents(value.billed),
        collected: fromCents(value.collected),
      };
    });

  const quoteRows = quotes ?? [];
  const acceptedQuotes = quoteRows.filter((q) => q.status === "ACCEPTED" || q.status === "CONVERTED");

  return {
    currency: profile?.currency ?? "XOF",
    period: { from, to },
    kpi: {
      billed: fromCents(billed),
      collected: fromCents(collected),
      pending: fromCents(pending),
      invoiceCount: rows.length,
      collectionRate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
    },
    quotes: {
      total: quoteRows.length,
      accepted: acceptedQuotes.length,
      pipeline: fromCents(
        quoteRows
          .filter((q) => q.status === "SENT")
          .reduce((acc, q) => acc + toCents(Number(q.total)), 0),
      ),
      conversionRate: quoteRows.length
        ? Math.round((acceptedQuotes.length / quoteRows.length) * 100)
        : 0,
    },
    series,
  };
}
