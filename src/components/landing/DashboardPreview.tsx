import { ChevronDown, TrendingDown, TrendingUp, X } from "lucide-react";
import { Gauge } from "./Gauge";

function Toggle({ active, other }: { active: string; other: string }) {
  return (
    <div className="mt-4 flex rounded-full bg-muted p-1 text-[12px]">
      <span className="flex-1 rounded-full bg-card py-1.5 text-center font-medium shadow-glass">
        {active}
      </span>
      <span className="flex-1 py-1.5 text-center text-muted-foreground">{other}</span>
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div className="px-3 sm:px-4">
      <div className="mx-auto w-full max-w-[880px] rounded-3xl bg-secondary/80 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl bg-card p-5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-primary">Devis envoyés</span>
              <span className="text-muted-foreground">Ce mois</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="tabular text-[28px] font-semibold leading-none">6 896</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                <TrendingDown className="size-3" /> -3 382 (33%)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Comparé à hier</p>
            <p className="mt-4 text-center text-[12px] text-muted-foreground">Objectif du mois</p>
            <Gauge value={92} showLabels min="389K" max="425K" />
            <Toggle active="Facturé" other="Encaissé" />
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5">
            {[
              { label: "Afficher les chiffres pour", value: "Ce mois" },
              { label: "Comparer la période par", value: "Mois en cours (MTD)" },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[12px] text-muted-foreground">{f.label}</p>
                <div className="mt-1 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[13px]">
                  {f.value}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
            {[
              { label: "Objectif devis (ce mois)", value: "10" },
              { label: "Objectif devis (cette année)", value: "100" },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[12px] text-muted-foreground">{f.label}</p>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px]">
                  <span className="text-muted-foreground">#</span>
                  <span className="tabular">{f.value}</span>
                </div>
              </div>
            ))}
            <div className="mt-auto flex items-center gap-4 pt-1 text-[13px]">
              <span className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground">
                Enregistrer
              </span>
              <span className="text-muted-foreground underline">Annuler</span>
              <X className="ml-auto size-4 text-muted-foreground" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl bg-card p-5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-primary">Relances</span>
              <span className="text-muted-foreground">aujourd'hui</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="tabular text-[28px] font-semibold leading-none">0</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <TrendingUp className="size-3" /> 0
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Comparé à hier</p>
            <Gauge value={68} color="var(--muted-foreground)" />
            <Toggle active="Factures réglées" other="Relances" />
          </div>
        </div>
      </div>
    </div>
  );
}
