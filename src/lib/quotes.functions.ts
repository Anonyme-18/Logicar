import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quoteInput, clientInput } from "./schemas";
import { z } from "zod";

const draftInput = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional().nullable(),
  issue_date: z.string(),
  valid_until: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
    }),
  ),
});

/** Contexte de l'éditeur : devis existant (ou vide) + clients + profil. */
export const getQuoteEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string }) => input)
  .handler(async ({ data, context }) => {
    const { isQuoteLocked, loadProfile } = await import("./quotes.server");
    const { supabase, userId } = context;

    const [{ data: clients }, profile] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, company_name, city")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("name"),
      loadProfile(supabase, userId),
    ]);

    let quote = null;
    let items: { description: string; quantity: number; unit_price: number; line_total: number }[] = [];

    if (data.id) {
      const { data: q, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!q) throw new Error("Devis introuvable.");
      quote = q;
      const { data: rows } = await supabase
        .from("quote_items")
        .select("description, quantity, unit_price, line_total")
        .eq("quote_id", data.id)
        .order("position");
      items = (rows ?? []).map((r) => ({
        description: r.description,
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
        line_total: Number(r.line_total),
      }));
    }

    return {
      quote,
      items,
      clients: clients ?? [],
      currency: profile?.currency ?? "XOF",
      locked: quote ? isQuoteLocked(quote.status) : false,
    };
  });

/** Aperçu PDF live : tous les totaux sont recalculés côté serveur. */
export const renderQuotePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => draftInput.parse(input))
  .handler(async ({ data, context }) => {
    const { computeTotals, loadProfile, quoteStatusLabel } = await import("./quotes.server");
    const { buildDocumentPdf, toBase64 } = await import("./pdf.server");
    const { supabase, userId } = context;

    const profile = await loadProfile(supabase, userId);
    const currency = profile?.currency ?? "XOF";

    let client = { name: "Client à sélectionner" } as {
      name: string;
      company_name?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
    };
    if (data.client_id) {
      const { data: c } = await supabase
        .from("clients")
        .select("name, company_name, email, phone, address, city")
        .eq("id", data.client_id)
        .maybeSingle();
      if (c) client = c;
    }

    let number = "DEV-XXXX-0000 (brouillon)";
    let statusLabel = "Brouillon";
    if (data.id) {
      const { data: q } = await supabase
        .from("quotes")
        .select("quote_number, status")
        .eq("id", data.id)
        .maybeSingle();
      if (q) {
        number = q.quote_number;
        statusLabel = quoteStatusLabel(q.status);
      }
    }

    const { lines, total } = computeTotals(data.items.filter((i) => i.description.trim().length > 0));

    const bytes = await buildDocumentPdf({
      kind: "DEVIS",
      number,
      issue_date: data.issue_date,
      valid_until: data.valid_until ?? null,
      statusLabel,
      notes: data.notes ?? null,
      currency,
      artisan: profile ?? {},
      client,
      items: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_total: l.line_total,
      })),
      total,
    });

    return {
      pdf: toBase64(bytes),
      totals: {
        currency,
        subtotal: total,
        total,
        lines: lines.map((l) => ({ position: l.position, line_total: l.line_total })),
      },
    };
  });

/** Création / mise à jour d'un devis. Refusée si le devis est verrouillé. */
export const saveQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { computeTotals, isQuoteLocked } = await import("./quotes.server");
    const { supabase, userId } = context;
    const { lines, subtotal, total } = computeTotals(data.items);

    let quoteId = data.id;

    if (quoteId) {
      const { data: existing, error } = await supabase
        .from("quotes")
        .select("id, status")
        .eq("id", quoteId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!existing) throw new Error("Devis introuvable.");
      if (isQuoteLocked(existing.status)) {
        throw new Error("Ce devis est verrouillé : il ne peut plus être modifié.");
      }
      const { error: upErr } = await supabase
        .from("quotes")
        .update({
          client_id: data.client_id,
          issue_date: data.issue_date,
          valid_until: data.valid_until || null,
          notes: data.notes || null,
          subtotal,
          total,
        })
        .eq("id", quoteId);
      if (upErr) throw new Error(upErr.message);
      const { error: delErr } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
      if (delErr) throw new Error(delErr.message);
    } else {
      const { data: number, error: numErr } = await supabase.rpc("next_document_number", {
        _user_id: userId,
        _kind: "quote",
      });
      if (numErr) throw new Error(numErr.message);
      const { data: created, error: insErr } = await supabase
        .from("quotes")
        .insert({
          user_id: userId,
          client_id: data.client_id,
          quote_number: number as string,
          issue_date: data.issue_date,
          valid_until: data.valid_until || null,
          notes: data.notes || null,
          subtotal,
          total,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      quoteId = created.id;
    }

    const { error: itemsErr } = await supabase
      .from("quote_items")
      .insert(lines.map((l) => ({ ...l, quote_id: quoteId! })));
    if (itemsErr) throw new Error(itemsErr.message);

    return { id: quoteId!, subtotal, total };
  });

/** Changement de statut (envoi, acceptation = verrouillage, refus). */
export const setQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isQuoteLocked } = await import("./quotes.server");
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Devis introuvable.");
    if (existing.status === "CONVERTED") {
      throw new Error("Ce devis a déjà été transformé en facture.");
    }
    if (isQuoteLocked(existing.status) && data.status !== "ACCEPTED") {
      throw new Error("Ce devis est verrouillé.");
    }
    const { error } = await supabase
      .from("quotes")
      .update({
        status: data.status,
        shared_at: data.status === "SENT" ? new Date().toISOString() : undefined,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });

/** Liste des devis (colonne latérale de l'éditeur). */
export const listQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quotes")
      .select("id, quote_number, status, issue_date, total, client_id, clients(name)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Création rapide d'un client depuis l'éditeur. */
export const createClientQuick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clientInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("clients")
      .insert({
        user_id: context.userId,
        name: data.name,
        company_name: data.company_name || null,
        email: data.email || null,
        phone: data.phone || null,
        city: data.city || null,
      })
      .select("id, name, company_name, city")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });
