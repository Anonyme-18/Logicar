import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Lock, CheckCircle2, Ban, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvoice, setInvoiceStatus } from "@/lib/invoices.functions";
import { StatusPill } from "@/components/StatusPill";
import { formatMoney, formatQuantity } from "@/lib/money";
import { formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/factures/$id")({
  head: () => ({
    meta: [
      { title: "Facture — Atelier" },
      {
        name: "description",
        content: "Consultez une facture verrouillée, son PDF et son statut de règlement.",
      },
      { property: "og:title", content: "Facture — Atelier" },
      {
        property: "og:description",
        content: "Détail d'une facture : lignes, total, PDF et règlement.",
      },
    ],
  }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchInvoice = useServerFn(getInvoice);
  const updateStatus = useServerFn(setInvoiceStatus);
  const [busy, setBusy] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice({ data: { id } }),
  });

  const changeStatus = async (status: "PAID" | "UNPAID" | "CANCELLED") => {
    setBusy(true);
    try {
      await updateStatus({ data: { id, status } });
      await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Statut mis à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de mettre à jour le statut");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!data) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${data.pdf}`;
    link.download = `${data.invoice.invoice_number}.pdf`;
    link.click();
  };

  if (isPending || !data) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const { invoice, client, items, currency } = data;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <Link
              to="/factures"
              className="mb-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Factures
            </Link>
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {invoice.invoice_number}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusPill status={invoice.status} />
              <span>{formatDateLong(invoice.issue_date)}</span>
              {invoice.locked && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Lock className="size-3" /> Verrouillée
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="size-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Destinataire
              </h2>
              <p className="mt-2 font-medium">{client.name}</p>
              {client.company_name && (
                <p className="text-sm text-muted-foreground">{client.company_name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {[client.address, client.city].filter(Boolean).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                {[client.phone, client.email].filter(Boolean).join(" · ")}
              </p>
              {invoice.quote_number_ref && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Issue du devis {invoice.quote_number_ref}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prestations
              </h2>
              <ul className="divide-y divide-border/60">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{item.description}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatQuantity(item.quantity)} × {formatMoney(item.unit_price, currency)}
                      </span>
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(item.line_total, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-ink-foreground">
                <span className="text-sm font-medium">Total</span>
                <span className="font-display text-xl font-semibold tabular-nums">
                  {formatMoney(invoice.total, currency)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {invoice.status !== "PAID" && (
                <Button className="flex-1" disabled={busy} onClick={() => changeStatus("PAID")}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Marquer payée
                </Button>
              )}
              {invoice.status === "PAID" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => changeStatus("UNPAID")}
                >
                  Annuler le règlement
                </Button>
              )}
              {invoice.status !== "CANCELLED" && (
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => changeStatus("CANCELLED")}
                >
                  <Ban className="size-4" /> Annuler la facture
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
            <iframe
              title="Aperçu de la facture"
              src={`data:application/pdf;base64,${data.pdf}#toolbar=0&navpanes=0`}
              className="h-[55vh] w-full rounded-xl border border-border/50 lg:h-[75vh]"
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
