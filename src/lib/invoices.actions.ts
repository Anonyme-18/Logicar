"use server";

import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { loadProfile } from "./quotes.server";
import { buildDocumentPdf, toBase64 } from "./pdf.server";
import { INVOICE_STATUS } from "./status";

type InvoiceItemRow = {
  description: string;
  quantity: string | number;
  unit_price: string | number;
  line_total: string | number;
  position?: number;
};
type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  paid_at: string | null;
  quote_number_ref: string | null;
  notes: string | null;
  subtotal: string | number;
  total: string | number;
  locked: boolean;
  client: {
    name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  };
};
type ConversionQuoteRow = {
  id: string;
  client_id: string;
  quote_number: string;
  notes: string | null;
  subtotal: string | number;
  total: string | number;
  status: string;
};

export async function listInvoicesAction() {
  const user = await requireUser();
  return query(
    "SELECT i.id, i.invoice_number, i.status, i.issue_date, i.total, i.paid_at, i.quote_number_ref, json_build_object('name', c.name, 'company_name', c.company_name) AS clients FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.user_id = $1 ORDER BY i.created_at DESC LIMIT 100",
    [user.id],
  );
}

export async function getInvoiceAction(data: { id: string }) {
  const parsed = z.object({ id: z.string().uuid() }).parse(data);
  const user = await requireUser();
  const invoice = (
    await query<InvoiceRow>(
      "SELECT i.*, json_build_object('name', c.name, 'company_name', c.company_name, 'email', c.email, 'phone', c.phone, 'address', c.address, 'city', c.city) AS client FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.id = $1 AND i.user_id = $2",
      [parsed.id, user.id],
    )
  )[0];
  if (!invoice) throw new Error("Facture introuvable.");
  const [rows, profile] = await Promise.all([
    query<InvoiceItemRow>(
      "SELECT description, quantity, unit_price, line_total FROM invoice_items WHERE invoice_id = $1 ORDER BY position",
      [parsed.id],
    ),
    loadProfile(user.id),
  ]);
  const items = rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    line_total: Number(row.line_total),
  }));
  const currency = profile?.currency ?? "XOF";
  const client = invoice.client;
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
}

export async function convertQuoteAction(data: { quote_id: string }) {
  const parsed = z.object({ quote_id: z.string().uuid() }).parse(data);
  const user = await requireUser();
  const invoiceId = await transaction(async (db) => {
    const quote = (
      await db.query<ConversionQuoteRow>(
        "SELECT * FROM quotes WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [parsed.quote_id, user.id],
      )
    ).rows[0];
    if (!quote) throw new Error("Devis introuvable.");
    if (quote.status !== "ACCEPTED")
      throw new Error("Seul un devis accepté peut être transformé en facture.");
    const existing = (
      await db.query("SELECT id FROM invoices WHERE quote_id = $1", [parsed.quote_id])
    ).rows[0];
    if (existing) throw new Error("Une facture existe déjà pour ce devis.");
    const items = (
      await db.query<InvoiceItemRow>(
        "SELECT description, quantity, unit_price, line_total, position FROM quote_items WHERE quote_id = $1 ORDER BY position",
        [parsed.quote_id],
      )
    ).rows;
    if (!items.length) throw new Error("Ce devis ne contient aucune ligne.");
    const number = (
      await db.query<{ next_document_number: string }>(
        "SELECT next_document_number($1, 'invoice')",
        [user.id],
      )
    ).rows[0].next_document_number;
    const id = (
      await db.query<{ id: string }>(
        "INSERT INTO invoices (user_id, client_id, quote_id, quote_number_ref, invoice_number, notes, subtotal, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
        [
          user.id,
          quote.client_id,
          quote.id,
          quote.quote_number,
          number,
          quote.notes,
          quote.subtotal,
          quote.total,
        ],
      )
    ).rows[0].id;
    const values: unknown[] = [];
    const placeholders = items
      .map((item, index) => {
        const offset = index * 6;
        values.push(
          id,
          item.description,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.position,
        );
        return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6})`;
      })
      .join(",");
    await db.query(
      `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total, position) VALUES ${placeholders}`,
      values,
    );
    await db.query("UPDATE quotes SET status = 'CONVERTED' WHERE id = $1", [quote.id]);
    await db.query(
      "INSERT INTO document_events (user_id, entity_type, entity_id, event_type, metadata) VALUES ($1,'invoice',$2,'CONVERTED_FROM_QUOTE',$3)",
      [user.id, id, JSON.stringify({ quote_id: quote.id, quote_number: quote.quote_number })],
    );
    return id;
  });
  return { id: invoiceId };
}

export async function setInvoiceStatusAction(data: {
  id: string;
  status: "UNPAID" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED";
}) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"]),
    })
    .parse(data);
  const user = await requireUser();
  const result = await query(
    "UPDATE invoices SET status = $1, paid_at = CASE WHEN $1 = 'PAID' THEN now() ELSE NULL END WHERE id = $2 AND user_id = $3 RETURNING status",
    [parsed.status, parsed.id, user.id],
  );
  if (!result[0]) throw new Error("Facture introuvable.");
  return { status: parsed.status };
}
