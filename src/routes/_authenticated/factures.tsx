import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listInvoices } from "@/lib/invoices.functions";
import { formatMoney } from "@/lib/money";
import { formatDateShort, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({
    meta: [
      { title: "Factures — Atelier" },
      {
        name: "description",
        content:
          "Suivez vos factures verrouillées, leur statut de règlement et téléchargez le PDF en un clic.",
      },
      { property: "og:title", content: "Factures — Atelier" },
      {
        property: "og:description",
        content: "Factures issues de vos devis acceptés, montants et règlements en un coup d'œil.",
      },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const fetchInvoices = useServerFn(listInvoices);
  const { data, isPending } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices({}),
  });
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter(
      (r) =>
        r.invoice_number.toLowerCase().includes(q) ||
        (r.clients?.name ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const totals = useMemo(() => {
    const list = data ?? [];
    const sum = (f: (r: (typeof list)[number]) => boolean) =>
      list.filter(f).reduce((acc, r) => acc + Number(r.total), 0);
    return {
      all: sum(() => true),
      paid: sum((r) => r.status === "PAID"),
      pending: sum((r) => r.status !== "PAID" && r.status !== "CANCELLED"),
    };
  }, [data]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Factures
          </h1>
          <p className="text-sm text-muted-foreground">
            Documents verrouillés générés depuis vos devis acceptés.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Total facturé", value: totals.all },
            { label: "Encaissé", value: totals.paid, highlight: true },
            { label: "En attente", value: totals.pending },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "rounded-2xl border border-border/60 p-4 shadow-sm",
                kpi.highlight ? "bg-ink text-ink-foreground" : "bg-card",
              )}
            >
              <p
                className={cn(
                  "text-xs",
                  kpi.highlight ? "text-ink-foreground/70" : "text-muted-foreground",
                )}
              >
                {kpi.label}
              </p>
              <p className="mt-1.5 font-display text-xl font-semibold tabular-nums sm:text-2xl">
                {formatMoney(kpi.value)}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold">Toutes les factures</h2>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="pl-9"
              />
            </div>
          </div>

          {isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ReceiptText className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucune facture. Acceptez un devis puis transformez-le en facture.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    to="/factures/$id"
                    params={{ id: r.id }}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {initials(r.clients?.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {r.clients?.name ?? "Client"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.invoice_number} · {formatDateShort(r.issue_date)}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <StatusPill status={r.status} />
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums">
                      {formatMoney(Number(r.total))}
                      <span className="mt-1 block sm:hidden">
                        <StatusPill status={r.status} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
