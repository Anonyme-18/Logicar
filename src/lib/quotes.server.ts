import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { lineTotalCents, fromCents, sumCents } from "./money";
import { QUOTE_STATUS, type QuoteStatus } from "./status";

export type DbClient = SupabaseClient<Database>;

export type RawItem = { description: string; quantity: number; unit_price: number };

/** Statuts pour lesquels le devis n'est plus modifiable. */
export const LOCKED_QUOTE_STATUSES: QuoteStatus[] = ["ACCEPTED", "CONVERTED"];

export function isQuoteLocked(status: string): boolean {
  return LOCKED_QUOTE_STATUSES.includes(status as QuoteStatus);
}

/** Recalcul serveur : seule source de vérité pour les montants. */
export function computeTotals(items: RawItem[]) {
  const lines = items.map((item, index) => {
    const cents = lineTotalCents(item.quantity, item.unit_price);
    return {
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: fromCents(cents),
      position: index,
      _cents: cents,
    };
  });
  const subtotal = fromCents(sumCents(lines.map((l) => l._cents)));
  return {
    lines: lines.map(({ _cents, ...rest }) => rest),
    subtotal,
    total: subtotal,
  };
}

export async function loadProfile(supabase: DbClient, userId: string) {
  const { data } = await supabase
    .from("artisan_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export function quoteStatusLabel(status: string): string {
  return QUOTE_STATUS[status as QuoteStatus]?.label ?? status;
}
