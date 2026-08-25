import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, Send, Lock, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getQuoteEditor,
  renderQuotePreview,
  saveQuote,
  setQuoteStatus,
  listQuotes,
} from "@/lib/quotes.functions";
import { formatMoney } from "@/lib/money";
import { toISODate } from "@/lib/format";
import { QUOTE_STATUS, type QuoteStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/devis/$id")({
  head: () => ({
    meta: [
      { title: "Éditeur de devis — Atelier" },
      {
        name: "description",
        content:
          "Composez vos devis ligne par ligne avec un aperçu PDF en direct et des totaux recalculés côté serveur.",
      },
      { property: "og:title", content: "Éditeur de devis — Atelier" },
      {
        property: "og:description",
        content: "Aperçu PDF en direct, lignes modifiables jusqu'au verrouillage du devis.",
      },
    ],
  }),
  component: QuoteEditorPage,
});

type LineDraft = { key: string; description: string; quantity: string; unit_price: string };

function newLine(): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    quantity: "1",
    unit_price: "",
  };
}

function QuoteEditorPage() {
  const { id } = Route.useParams();
  const quoteId = id === "nouveau" ? undefined : id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchEditor = useServerFn(getQuoteEditor);
  const fetchPreview = useServerFn(renderQuotePreview);
  const fetchList = useServerFn(listQuotes);
  const persistQuote = useServerFn(saveQuote);
  const changeStatus = useServerFn(setQuoteStatus);

  const { data: editor, isPending } = useQuery({
    queryKey: ["quote-editor", quoteId ?? "nouveau"],
    queryFn: () => fetchEditor({ data: quoteId ? { id: quoteId } : {} }),
  });
  const { data: quoteList } = useQuery({ queryKey: ["quotes"], queryFn: () => fetchList({}) });

  const [clientId, setClientId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    const key = quoteId ?? "nouveau";
    if (hydrated.current === key) return;
    hydrated.current = key;
    if (editor.quote) {
      setClientId(editor.quote.client_id);
      setIssueDate(editor.quote.issue_date);
      setValidUntil(editor.quote.valid_until ?? "");
      setNotes(editor.quote.notes ?? "");
    }
    if (editor.items.length > 0) {
      setLines(
        editor.items.map((i) => ({
          key: Math.random().toString(36).slice(2),
          description: i.description,
          quantity: String(i.quantity),
          unit_price: String(i.unit_price),
        })),
      );
    }
  }, [editor, quoteId]);

  const locked = editor?.locked ?? false;
  const currency = editor?.currency ?? "XOF";
  const status = (editor?.quote?.status ?? "DRAFT") as QuoteStatus;

  const draft = useMemo(
    () => ({
      id: quoteId,
      client_id: clientId || null,
      issue_date: issueDate,
      valid_until: validUntil || null,
      notes: notes || null,
      items: lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity.replace(",", ".")) || 0,
        unit_price: Number(l.unit_price.replace(",", ".")) || 0,
      })),
    }),
    [quoteId, clientId, issueDate, validUntil, notes, lines],
  );

  const [debounced, setDebounced] = useState(draft);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(draft), 500);
    return () => clearTimeout(t);
  }, [draft]);

  const { data: preview, isFetching: previewing } = useQuery({
    queryKey: ["quote-preview", debounced],
    queryFn: () => fetchPreview({ data: debounced }),
    enabled: !isPending,
    placeholderData: (prev) => prev,
  });

  const pdfUrl = preview ? `data:application/pdf;base64,${preview.pdf}#toolbar=0&navpanes=0` : null;

  async function handleSave() {
    if (!clientId) {
      toast.error("Sélectionnez un client avant d'enregistrer");
      return;
    }
    setSaving(true);
    try {

      const result = await persistQuote({
        data: {
          id: quoteId,
          client_id: clientId,
          issue_date: issueDate,
          valid_until: validUntil || null,
          notes: notes || null,
          items: draft.items.filter((i) => i.description.trim().length > 0),
        },
      });
      toast.success("Devis enregistré");
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      if (!quoteId) {
        hydrated.current = null;
        navigate({ to: "/devis/$id", params: { id: result.id } });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["quote-editor", quoteId] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(next: "SENT" | "ACCEPTED" | "REJECTED") {
    if (!quoteId) return;
    try {
      await changeStatus({ data: { id: quoteId, status: next } });
      await queryClient.invalidateQueries({ queryKey: ["quote-editor", quoteId] });
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success(`Statut mis à jour : ${QUOTE_STATUS[next].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    }
  }

  const serverTotal = preview?.totals.total ?? 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {quoteId ? (editor?.quote?.quote_number ?? "Devis") : "Nouveau devis"}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs",
                locked && "text-warning-foreground",
              )}
            >
              {locked ? <Lock className="size-3" /> : null}
              {QUOTE_STATUS[status].label}
            </span>
            Totaux calculés côté serveur uniquement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={locked || saving || !clientId}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer
          </Button>
          {quoteId && status === "DRAFT" ? (
            <Button variant="secondary" onClick={() => handleStatus("SENT")}>
              <Send className="size-4" /> Envoyer
            </Button>
          ) : null}
          {quoteId && status === "SENT" ? (
            <>
              <Button variant="secondary" onClick={() => handleStatus("ACCEPTED")}>
                Marquer accepté
              </Button>
              <Button variant="ghost" onClick={() => handleStatus("REJECTED")}>
                Refusé
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {locked ? (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Ce devis est verrouillé : les lignes et montants ne peuvent plus être modifiés.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-glass-border surface-glass p-4 shadow-glass sm:p-6">
            <h2 className="font-display text-lg font-semibold">Informations</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId} disabled={locked}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editor?.clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.company_name ? ` — ${c.company_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issue">Date d'émission</Label>
                <Input
                  id="issue"
                  type="date"
                  className="mt-1.5"
                  value={issueDate}
                  disabled={locked}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="valid">Valable jusqu'au</Label>
                <Input
                  id="valid"
                  type="date"
                  className="mt-1.5"
                  value={validUntil}
                  disabled={locked}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Notes / conditions</Label>
                <Textarea
                  id="notes"
                  className="mt-1.5"
                  rows={3}
                  value={notes}
                  disabled={locked}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-glass-border surface-glass p-4 shadow-glass sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Prestations</h2>
              <Button
                variant="secondary"
                size="sm"
                disabled={locked}
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                <Plus className="size-4" /> Ligne
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_auto] sm:items-end"
                >
                  <div>
                    <Label className="text-xs text-muted-foreground">Désignation</Label>
                    <Input
                      className="mt-1"
                      value={line.description}
                      disabled={locked}
                      placeholder="Pose de menuiserie…"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, description: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Qté</Label>
                    <Input
                      className="mt-1 tabular"
                      inputMode="decimal"
                      value={line.quantity}
                      disabled={locked}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prix unitaire</Label>
                    <Input
                      className="mt-1 tabular"
                      inputMode="decimal"
                      value={line.unit_price}
                      disabled={locked}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, unit_price: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="tabular text-sm text-muted-foreground">
                      {formatMoney(
                        preview?.totals.lines.find((l) => l.position === index)?.line_total ?? 0,
                        currency,
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={locked || lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">Total (serveur)</span>
              <span className="tabular font-display text-2xl font-semibold">
                {formatMoney(serverTotal, currency)}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-glass-border surface-glass p-4 shadow-glass sm:p-6">
            <h2 className="font-display text-lg font-semibold">Devis récents</h2>
            <ul className="mt-3 divide-y divide-border/60 text-sm">
              {(quoteList ?? []).slice(0, 8).map((q) => (
                <li key={q.id}>
                  <Link
                    to="/devis/$id"
                    params={{ id: q.id }}
                    className="flex items-center justify-between gap-3 py-2 hover:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      {q.quote_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {QUOTE_STATUS[q.status as QuoteStatus].label} ·{" "}
                      {formatMoney(Number(q.total), currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-glass-border surface-glass p-4 shadow-glass">
            <div className="flex items-center justify-between px-2 pb-3">
              <h2 className="font-display text-lg font-semibold">Aperçu PDF</h2>
              {previewing ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Mise à jour…
                </span>
              ) : null}
            </div>
            {pdfUrl ? (
              <iframe
                title="Aperçu du devis"
                src={pdfUrl}
                className="h-[55vh] w-full rounded-xl border border-border/60 bg-white sm:h-[70vh]"
              />
            ) : (
              <Skeleton className="h-[55vh] w-full rounded-xl sm:h-[70vh]" />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
