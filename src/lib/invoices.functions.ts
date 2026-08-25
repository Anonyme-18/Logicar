import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Liste des factures. */
export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, issue_date, total, paid_at, quote_number_ref, clients(name, company_name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Détail d'une facture + PDF (base64) généré côté serveur. */
export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { loadProfile } = await import("./quotes.server");
    const { buildDocumentPdf, toBase64 } = await import("./pdf.server");
    const { INVOICE_STATUS } = await import("./status");
    const { supabase, userId } = context;

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*, clients(name, company_name, email, phone, address, city)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) throw new Error("Facture introuvable.");

    const [{ data: rows }, profile] = await Promise.all([
      supabase
        .from("invoice_items")
        .select("description, quantity, unit_price, line_total")
        .eq("invoice_id", data.id)
        .order("position"),
      loadProfile(supabase, userId),
    ]);

    const items = (rows ?? []).map((r) => ({
      description: r.description,
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      line_total: Number(r.line_total),
    }));

    const currency = profile?.currency ?? "XOF";
    const client = invoice.clients ?? { name: "Client" };

    const bytes = await buildDocumentPdf({
      kind: "FACTURE",
      number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      statusLabel:
        INVOICE_STATUS[invoice.status as keyof typeof INVOICE_STATUS]?.label ?? invoice.status,
      paidAt: invoice.paid_at,
      quoteRef: invoice.quote_number_ref,
      notes: invoice.notes,
      currency,
      artisan: profile ?? {},
      client,
      items,
      total: Number(invoice.total),
    });

    return {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        issue_date: invoice.issue_date,
        paid_at: invoice.paid_at,
        quote_number_ref: invoice.quote_number_ref,
        notes: invoice.notes,
        subtotal: Number(invoice.subtotal),
        total: Number(invoice.total),
        locked: invoice.locked,
      },
      client,
      items,
      currency,
      pdf: toBase64(bytes),
    };
  });

/** Transformation atomique d'un devis accepté en facture verrouillée. */
export const convertQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quote_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: invoiceId, error } = await context.supabase.rpc("convert_quote_to_invoice", {
      _quote_id: data.quote_id,
    });
    if (error) throw new Error(error.message);
    return { id: invoiceId as string };
  });

/** Mise à jour du statut de règlement (le contenu reste verrouillé). */
export const setInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoices")
      .update({
        status: data.status,
        paid_at: data.status === "PAID" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });
