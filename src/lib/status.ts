export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CONVERTED";
export type InvoiceStatus = "UNPAID" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SENT: { label: "Envoyé", tone: "info" },
  ACCEPTED: { label: "Accepté", tone: "success" },
  REJECTED: { label: "Refusé", tone: "danger" },
  CONVERTED: { label: "Converti", tone: "primary" },
};

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "En attente", tone: "warning" },
  PAID: { label: "Payée", tone: "success" },
  PARTIALLY_PAID: { label: "Partiellement payée", tone: "info" },
  OVERDUE: { label: "En retard", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const QUOTE_FILTERS: { value: "ALL" | QuoteStatus; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "SENT", label: "Envoyés" },
  { value: "ACCEPTED", label: "Acceptés" },
  { value: "CONVERTED", label: "Convertis" },
];
