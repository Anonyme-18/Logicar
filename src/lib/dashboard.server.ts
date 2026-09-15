import { query } from "@/lib/db";
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
export async function buildDashboard(userId: string, from: string, to: string) {
  const [profile, invoices, quotes] = await Promise.all([
    query<{ currency: string }>("SELECT currency FROM artisan_profiles WHERE user_id = $1", [
      userId,
    ]),
    query<{ total: string; status: string; issue_date: string }>(
      "SELECT total, status, issue_date FROM invoices WHERE user_id = $1 AND issue_date BETWEEN $2 AND $3 ORDER BY issue_date",
      [userId, from, to],
    ),
    query<{ total: string; status: string; issue_date: string }>(
      "SELECT total, status, issue_date FROM quotes WHERE user_id = $1 AND issue_date BETWEEN $2 AND $3",
      [userId, from, to],
    ),
  ]);
  const rows = invoices.filter((invoice) => invoice.status !== "CANCELLED");
  let billed = 0;
  let collected = 0;
  let pending = 0;
  const buckets = new Map<string, { billed: number; collected: number }>();
  for (const invoice of rows) {
    const cents = toCents(Number(invoice.total));
    billed += cents;
    if (invoice.status === "PAID") collected += cents;
    if (PENDING.includes(invoice.status)) pending += cents;
    const key = invoice.issue_date.slice(0, 7);
    const bucket = buckets.get(key) ?? { billed: 0, collected: 0 };
    bucket.billed += cents;
    if (invoice.status === "PAID") bucket.collected += cents;
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
  const acceptedQuotes = quotes.filter(
    (quote) => quote.status === "ACCEPTED" || quote.status === "CONVERTED",
  );
  return {
    currency: profile[0]?.currency ?? "XOF",
    period: { from, to },
    kpi: {
      billed: fromCents(billed),
      collected: fromCents(collected),
      pending: fromCents(pending),
      invoiceCount: rows.length,
      collectionRate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
    },
    quotes: {
      total: quotes.length,
      accepted: acceptedQuotes.length,
      pipeline: fromCents(
        quotes
          .filter((q) => q.status === "SENT")
          .reduce((sum, q) => sum + toCents(Number(q.total)), 0),
      ),
      conversionRate: quotes.length ? Math.round((acceptedQuotes.length / quotes.length) * 100) : 0,
    },
    series,
  };
}
