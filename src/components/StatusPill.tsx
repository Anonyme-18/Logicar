import { INVOICE_STATUS, type InvoiceStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const meta = INVOICE_STATUS[status as InvoiceStatus];
  const tone = meta?.tone ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "success" && "bg-emerald-500/12 text-emerald-600",
        tone === "warning" && "bg-amber-500/12 text-amber-600",
        tone === "danger" && "bg-destructive/12 text-destructive",
        tone === "info" && "bg-primary/10 text-primary",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {meta?.label ?? status}
    </span>
  );
}
