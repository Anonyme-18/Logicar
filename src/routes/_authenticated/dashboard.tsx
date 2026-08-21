import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Wallet, Clock, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDashboard } from "@/lib/dashboard.functions";
import { formatMoney } from "@/lib/money";
import { toISODate } from "@/lib/format";
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
  const range = useMemo(() => rangeFor(period), [period]);
  const fetchDashboard = useServerFn(getDashboard);

  const { data, isPending } = useQuery({
    queryKey: ["dashboard", range.from, range.to],
    queryFn: () => fetchDashboard({ data: range }),
  });

  const currency = data?.currency ?? "XOF";

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Montants recalculés côté serveur sur la période sélectionnée.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border/60 surface-glass p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                period === p.key
                  ? "bg-primary text-primary-foreground shadow-glass"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Facturé"
          value={isPending ? null : formatMoney(data!.kpi.billed, currency)}
          hint={isPending ? "" : `${data!.kpi.invoiceCount} facture(s)`}
        />
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Encaissé"
          tone="success"
          value={isPending ? null : formatMoney(data!.kpi.collected, currency)}
          hint={isPending ? "" : `${data!.kpi.collectionRate}% du facturé`}
        />
        <KpiCard
          icon={<Clock className="size-4" />}
          label="En attente"
          tone="warning"
          value={isPending ? null : formatMoney(data!.kpi.pending, currency)}
          hint="Factures non réglées"
        />
        <KpiCard
          icon={<FileCheck2 className="size-4" />}
          label="Devis acceptés"
          value={isPending ? null : `${data!.quotes.accepted}/${data!.quotes.total}`}
          hint={
            isPending
              ? ""
              : `${data!.quotes.conversionRate}% · pipeline ${formatMoney(data!.quotes.pipeline, currency)}`
          }
        />
      </div>

      <div className="mt-6 rounded-2xl border border-glass-border surface-glass p-6 shadow-glass">
        <h2 className="font-display text-lg font-semibold">Facturé vs encaissé</h2>
        <div className="mt-6 h-[320px]">
          {isPending ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : data!.series.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucune facture sur cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data!.series} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="billed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={70}
                  tickFormatter={(v: number) => formatMoney(v, currency)}
                />
                <Tooltip
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
                <Area
                  type="monotone"
                  dataKey="billed"
                  stroke="var(--color-chart-1)"
                  fill="url(#billed)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--color-chart-2)"
                  fill="url(#collected)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  hint?: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-glass-border surface-glass p-5 shadow-glass lift">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground",
            tone === "success" && "bg-success/15 text-success",
            tone === "warning" && "bg-warning/20 text-warning-foreground",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      {value === null ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="mt-3 font-display text-2xl font-semibold tabular">{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
