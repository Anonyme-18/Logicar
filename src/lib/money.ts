/**
 * Calculs monétaires exacts.
 * Tous les montants circulent en "centimes" (entiers) pour éviter les erreurs
 * de virgule flottante. Les quantités supportent jusqu'à 3 décimales.
 */

export const QTY_SCALE = 1000;

export function toCents(value: number | string): number {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function toQtyUnits(value: number | string): number {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * QTY_SCALE);
}

/** line_total (en centimes) = quantity × unit_price, arrondi au centime. */
export function lineTotalCents(quantity: number | string, unitPrice: number | string): number {
  const q = toQtyUnits(quantity);
  const p = toCents(unitPrice);
  return Math.round((q * p) / QTY_SCALE);
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function formatMoney(amount: number | string, currency = "XOF"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  const decimals = currency === "XOF" ? 0 : 2;
  const body = safe.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${body} ${currencyLabel(currency)}`;
}

export function currencyLabel(currency: string): string {
  switch (currency) {
    case "XOF":
      return "FCFA";
    case "XAF":
      return "FCFA";
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return currency;
  }
}

export function formatQuantity(q: number | string): string {
  const n = typeof q === "string" ? Number(q) : q;
  if (!Number.isFinite(n)) return "0";
  return Number(n.toFixed(3)).toLocaleString("fr-FR");
}
