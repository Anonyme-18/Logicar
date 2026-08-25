import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Clock,
  FileCheck2,
  Plus,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDashboard } from "@/lib/dashboard.functions";
import { listQuotes } from "@/lib/quotes.functions";
import { formatMoney } from "@/lib/money";
import { formatDateShort, initials, toISODate } from "@/lib/format";
import { QUOTE_STATUS, type QuoteStatus } from "@/lib/status";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord financier — Atelier" },
      {
        name: "description",
        content:
          "Suivez votre chiffre facturé, vos encaissements et vos impayés, avec un graphique filtrable par période.",
      },
      { property: "og:title", content: "Tableau de bord financier — Atelier" },
      {
        property: "og:description",
        content: "KPI facturé, encaissé et en attente, recalculés côté serveur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const PERIODS = [
  { key: "30d", label: "30 jours", days: 30 },
  { key: "90d", label: "90 jours", days: 90 },
  { key: "12m", label: "12 mois", days: 365 },
  { key: "ytd", label: "Année en cours", days: 0 },
] as const;

function rangeFor(key: (typeof PERIODS)[number]["key"]) {
  const today = new Date();
  const to = toISODate(today);
  if (key === "ytd") return { from: `${today.getFullYear()}-01-01`, to };
  const days = PERIODS.find((p) => p.key === key)!.days;
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  return { from: toISODate(start), to };
}

function DashboardPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("12m");
  const [search, setSearch] = useState("");
  const range = useMemo(() => rangeFor(period), [period]);
  const fetchDashboard = useServerFn(getDashboard);
  const fetchQuotes = useServerFn(listQuotes);

  const { data, isPending } = useQuery({
    queryKey: ["dashboard", range.from, range.to],
    queryFn: () => fetchDashboard({ data: range }),
  });

  const { data: quotes } = useQuery({
    queryKey: ["quotes-recent"],
    queryFn: () => fetchQuotes({ data: undefined }),
  });

  const currency = data?.currency ?? "XOF";

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (quotes ?? [])
      .filter((q) =>
        term
          ? `${q.quote_number} ${(q.clients as { name?: string } | null)?.name ?? ""}`
              .toLowerCase()
              .includes(term)
          : true,
      )
      .slice(0, 6);
  }, [quotes, search]);

  return (
    <AppShell>
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-4xl">
            Bonjour 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez vos devis, vos encaissements et vos impayés en un coup d'œil.
          </p>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="inline-flex shrink-0 gap-1 rounded-full bg-card p-1 shadow-glass">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  period === p.key
                    ? "bg-ink text-ink-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>


      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* Carte solde */}
        <section className="rounded-3xl bg-card p-5 shadow-glass sm:p-6 lg:col-span-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total facturé</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
              {currency === "XOF" || currency === "XAF" ? "FCFA" : currency}
            </span>
          </div>
          {isPending ? (
            <Skeleton className="mt-3 h-10 w-48" />
          ) : (
            <p className="mt-2 font-display text-[26px] font-semibold leading-tight tabular sm:text-[34px]">
              {formatMoney(data!.kpi.billed, currency)}
            </p>
          )}
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
            <TrendingUp className="size-3.5" />
            {isPending ? "—" : `${data!.kpi.collectionRate}% déjà encaissé`}
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              to="/devis/$id"
              params={{ id: "nouveau" }}
              className="press inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-ink-foreground"
            >
              <Plus className="size-4" /> Nouveau devis
            </Link>
            <button className="press inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-medium">
              <ArrowUpRight className="size-4" /> Relancer
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            <p className="text-xs text-muted-foreground">
              Encaissement <span className="text-foreground">· période sélectionnée</span>
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(100, data?.kpi.collectionRate ?? 0)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular">
              <span>{isPending ? "—" : formatMoney(data!.kpi.collected, currency)}</span>
              <span>{isPending ? "—" : formatMoney(data!.kpi.billed, currency)}</span>
            </div>
          </div>
        </section>

        {/* Mini KPI */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-4">
          <MiniKpi
            featured
            icon={<Wallet className="size-4" />}
            label="Encaissé"
            value={isPending ? null : formatMoney(data!.kpi.collected, currency)}
            hint="Sur la période"
          />
          <MiniKpi
            icon={<Clock className="size-4" />}
            label="En attente"
            value={isPending ? null : formatMoney(data!.kpi.pending, currency)}
            hint="Factures non réglées"
          />
          <MiniKpi
            icon={<FileCheck2 className="size-4" />}
            label="Devis acceptés"
            value={isPending ? null : `${data!.quotes.accepted}/${data!.quotes.total}`}
            hint={isPending ? "" : `${data!.quotes.conversionRate}% de conversion`}
          />
          <MiniKpi
            icon={<TrendingUp className="size-4" />}
            label="Pipeline"
            value={isPending ? null : formatMoney(data!.quotes.pipeline, currency)}
            hint="Devis envoyés"
          />
        </section>

        {/* Graphique */}
        <section className="rounded-3xl bg-card p-5 shadow-glass sm:p-6 lg:col-span-4">
          <h2 className="font-display text-base font-semibold">Revenus</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Facturé et encaissé sur la période
          </p>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-ink" /> Facturé
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-brand" /> Encaissé
            </span>
          </div>
          <div className="mt-4 h-[230px]">
            {isPending ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : data!.series.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune facture sur cette période.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.series} barGap={4} margin={{ left: -12, right: 4 }}>
                  <CartesianGrid
                    strokeDasharray="4 6"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={60}
                    tickFormatter={(v: number) => formatMoney(v, currency)}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    formatter={(v: number, name) => [
                      formatMoney(v, currency),
                      name === "billed" ? "Facturé" : "Encaissé",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Bar dataKey="billed" fill="var(--color-ink)" radius={[6, 6, 6, 6]} barSize={10} />
                  <Bar
                    dataKey="collected"
                    fill="var(--color-brand)"
                    radius={[6, 6, 6, 6]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Activité récente */}
        <section className="rounded-3xl bg-card p-5 shadow-glass sm:p-6 lg:col-span-12">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <h2 className="min-w-0 truncate font-display text-base font-semibold">
              Devis récents
            </h2>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher"
                className="w-28 bg-transparent outline-none placeholder:text-muted-foreground sm:w-44"
              />
            </div>
          </div>

          {/* Liste mobile */}
          <ul className="mt-4 space-y-2 sm:hidden">
            {rows.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Aucun devis pour l'instant.
              </li>
            ) : (
              rows.map((q) => {
                const client = (q.clients as { name?: string } | null)?.name ?? "Client";
                const status = QUOTE_STATUS[q.status as QuoteStatus];
                return (
                  <li key={q.id}>
                    <Link
                      to="/devis/$id"
                      params={{ id: q.id }}
                      className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-foreground">
                        {initials(client)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{client}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <i
                            className={cn(
                              "size-1.5 rounded-full",
                              status?.tone === "success" && "bg-success",
                              status?.tone === "danger" && "bg-destructive",
                              status?.tone === "info" && "bg-info",
                              status?.tone === "primary" && "bg-brand",
                              (!status || status.tone === "neutral") && "bg-muted-foreground",
                            )}
                          />
                          {status?.label ?? q.status} · {q.quote_number}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tabular">
                          {formatMoney(Number(q.total), currency)}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular">
                          {formatDateShort(q.issue_date)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          <div className="mt-4 hidden overflow-x-auto sm:block">

            <table className="w-full min-w-[620px] border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="rounded-l-xl bg-muted/70 px-4 py-2.5 font-medium">Numéro</th>
                  <th className="bg-muted/70 px-4 py-2.5 font-medium">Client</th>
                  <th className="bg-muted/70 px-4 py-2.5 font-medium">Montant</th>
                  <th className="bg-muted/70 px-4 py-2.5 font-medium">Statut</th>
                  <th className="rounded-r-xl bg-muted/70 px-4 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Aucun devis pour l'instant.
                    </td>
                  </tr>
                ) : (
                  rows.map((q) => {
                    const client = (q.clients as { name?: string } | null)?.name ?? "Client";
                    const status = QUOTE_STATUS[q.status as QuoteStatus];
                    return (
                      <tr key={q.id} className="transition-colors hover:bg-muted/50">
                        <td className="rounded-l-xl px-4 py-3 font-medium tabular">
                          <Link to="/devis/$id" params={{ id: q.id }}>
                            {q.quote_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-foreground">
                              {initials(client)}
                            </span>
                            <span className="truncate">{client}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular">
                          {formatMoney(Number(q.total), currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <i
                              className={cn(
                                "size-1.5 rounded-full",
                                status?.tone === "success" && "bg-success",
                                status?.tone === "danger" && "bg-destructive",
                                status?.tone === "info" && "bg-info",
                                status?.tone === "primary" && "bg-brand",
                                (!status || status.tone === "neutral") && "bg-muted-foreground",
                              )}
                            />
                            {status?.label ?? q.status}
                          </span>
                        </td>
                        <td className="rounded-r-xl px-4 py-3 text-muted-foreground tabular">
                          {formatDateShort(q.issue_date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MiniKpi({
  icon,
  label,
  value,
  hint,
  featured,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  hint?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "lift rounded-3xl p-5 shadow-glass",
        featured ? "bg-brand text-brand-foreground" : "bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between text-sm",
          featured ? "text-brand-foreground/85" : "text-muted-foreground",
        )}
      >
        {label}
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            featured ? "bg-brand-foreground/20" : "bg-muted",
          )}
        >
          {icon}
        </span>
      </div>
      {value === null ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className="mt-3 font-display text-xl font-semibold tabular">{value}</p>
      )}
      {hint ? (
        <p
          className={cn(
            "mt-1 text-xs",
            featured ? "text-brand-foreground/80" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
