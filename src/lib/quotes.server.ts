import { query } from "@/lib/db";
import { lineTotalCents, fromCents, sumCents } from "./money";
import { QUOTE_STATUS, type QuoteStatus } from "./status";

export type RawItem = { description: string; quantity: number; unit_price: number };
export type Profile = {
  business_name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tax_identifier?: string | null;
  logo_url?: string | null;
  currency?: string | null;
  quote_terms?: string | null;
};
export const LOCKED_QUOTE_STATUSES: QuoteStatus[] = ["ACCEPTED", "CONVERTED"];
export function isQuoteLocked(status: string) {
  return LOCKED_QUOTE_STATUSES.includes(status as QuoteStatus);
}
export function computeTotals(items: RawItem[]) {
  const lines = items.map((item, position) => {
    const cents = lineTotalCents(item.quantity, item.unit_price);
    return {
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: fromCents(cents),
      position,
      _cents: cents,
    };
  });
  const subtotal = fromCents(sumCents(lines.map((line) => line._cents)));
  return { lines: lines.map(({ _cents, ...rest }) => rest), subtotal, total: subtotal };
}
export async function loadProfile(userId: string): Promise<Profile | null> {
  const rows = await query<Profile>("SELECT * FROM artisan_profiles WHERE user_id = $1", [userId]);
  return rows[0] ?? null;
}
export function quoteStatusLabel(status: string) {
  return QUOTE_STATUS[status as QuoteStatus]?.label ?? status;
}
