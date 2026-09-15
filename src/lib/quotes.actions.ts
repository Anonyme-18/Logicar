"use server";

import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { quoteInput, clientInput } from "./schemas";
import { isQuoteLocked, loadProfile, quoteStatusLabel, computeTotals } from "./quotes.server";
import { buildDocumentPdf, toBase64 } from "./pdf.server";

const draftInput = z
  .object({
    id: z.string().uuid().optional(),
    client_id: z.string().uuid().optional().nullable(),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    items: z.array(
      z.object({
        description: z.string().trim().max(300),
        quantity: z.number().positive().finite().max(999_999.999),
        unit_price: z.number().min(0).finite().max(99_999_999.99),
      }),
    ),
  })
  .refine(({ issue_date, valid_until }) => !valid_until || valid_until >= issue_date, {
    message: "La date de validité est invalide",
    path: ["valid_until"],
  });
export type DraftInput = z.infer<typeof draftInput>;
type Client = {
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
};
type QuoteEditorRow = {
  id: string;
  client_id: string;
  issue_date: string;
  valid_until: string | null;
  notes: string | null;
  quote_number: string;
  status: string;
};

async function ownedClient(userId: string, id: string) {
  return (
    (
      await query<Client>(
        "SELECT name, company_name, email, phone, address, city FROM clients WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        [id, userId],
      )
    )[0] ?? null
  );
}

export async function getQuoteEditorAction(data: { id?: string }) {
  const input = z.object({ id: z.string().uuid().optional() }).parse(data);
  const user = await requireUser();
  const [clients, profile] = await Promise.all([
    query(
      "SELECT id, name, company_name, city FROM clients WHERE user_id = $1 AND archived_at IS NULL ORDER BY name",
      [user.id],
    ),
    loadProfile(user.id),
  ]);
  let quote: QuoteEditorRow | null = null;
  let items: { description: string; quantity: number; unit_price: number; line_total: number }[] =
    [];
  if (input.id) {
    quote =
      (
        await query<QuoteEditorRow>(
          "SELECT id, client_id, issue_date, valid_until, notes, quote_number, status FROM quotes WHERE id = $1 AND user_id = $2",
          [input.id, user.id],
        )
      )[0] ?? null;
    if (!quote) throw new Error("Devis introuvable.");
    items = await query<{
      description: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>(
      "SELECT description, quantity, unit_price, line_total FROM quote_items WHERE quote_id = $1 ORDER BY position",
      [input.id],
    );
    items = items.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      line_total: Number(row.line_total),
    }));
  }
  return {
    quote,
    items,
    clients,
    currency: profile?.currency ?? "XOF",
    locked: quote ? isQuoteLocked(String(quote.status)) : false,
  };
}

export async function renderQuotePreviewAction(data: DraftInput) {
  const parsed = draftInput.parse(data);
  const user = await requireUser();
  const profile = await loadProfile(user.id);
  const currency = profile?.currency ?? "XOF";
  const client: Client = parsed.client_id
    ? ((await ownedClient(user.id, parsed.client_id)) ?? { name: "Client à sélectionner" })
    : { name: "Client à sélectionner" };
  let number = "DEV-XXXX-0000 (brouillon)";
  let statusLabel = "Brouillon";
  if (parsed.id) {
    const q = (
      await query<{ quote_number: string; status: string }>(
        "SELECT quote_number, status FROM quotes WHERE id = $1 AND user_id = $2",
        [parsed.id, user.id],
      )
    )[0];
    if (q) {
      number = q.quote_number;
      statusLabel = quoteStatusLabel(q.status);
    }
  }
  const { lines, total } = computeTotals(parsed.items.filter((item) => item.description.trim()));
  const bytes = await buildDocumentPdf({
    kind: "DEVIS",
    number,
    issue_date: parsed.issue_date,
    valid_until: parsed.valid_until ?? null,
    statusLabel,
    notes: parsed.notes ?? null,
    currency,
    artisan: profile ?? {},
    client,
    items: lines,
    total,
  });
  return {
    pdf: toBase64(bytes),
    totals: {
      currency,
      subtotal: total,
      total,
      lines: lines.map((line) => ({ position: line.position, line_total: line.line_total })),
    },
  };
}

export async function saveQuoteAction(data: z.infer<typeof quoteInput>) {
  const parsed = quoteInput.parse(data);
  const user = await requireUser();
  const client = await ownedClient(user.id, parsed.client_id);
  if (!client) throw new Error("Client invalide.");
  const { lines, subtotal, total } = computeTotals(parsed.items);
  const quoteId = await transaction(async (db) => {
    let id = parsed.id;
    if (id) {
      const existing = (
        await db.query<{ status: string }>(
          "SELECT status FROM quotes WHERE id = $1 AND user_id = $2 FOR UPDATE",
          [id, user.id],
        )
      ).rows[0];
      if (!existing) throw new Error("Devis introuvable.");
      if (isQuoteLocked(existing.status)) throw new Error("Ce devis est verrouillé.");
      await db.query(
        "UPDATE quotes SET client_id = $1, issue_date = $2, valid_until = $3, notes = $4, subtotal = $5, total = $6 WHERE id = $7 AND user_id = $8",
        [
          parsed.client_id,
          parsed.issue_date,
          parsed.valid_until || null,
          parsed.notes || null,
          subtotal,
          total,
          id,
          user.id,
        ],
      );
      await db.query("DELETE FROM quote_items WHERE quote_id = $1", [id]);
    } else {
      const number = (
        await db.query<{ next_document_number: string }>(
          "SELECT next_document_number($1, 'quote')",
          [user.id],
        )
      ).rows[0].next_document_number;
      id = (
        await db.query<{ id: string }>(
          "INSERT INTO quotes (user_id, client_id, quote_number, issue_date, valid_until, notes, subtotal, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
          [
            user.id,
            parsed.client_id,
            number,
            parsed.issue_date,
            parsed.valid_until || null,
            parsed.notes || null,
            subtotal,
            total,
          ],
        )
      ).rows[0].id;
    }
    const values: unknown[] = [];
    const placeholders = lines
      .map((line, index) => {
        const offset = index * 6;
        values.push(
          id,
          line.description,
          line.quantity,
          line.unit_price,
          line.line_total,
          line.position,
        );
        return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6})`;
      })
      .join(",");
    await db.query(
      `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total, position) VALUES ${placeholders}`,
      values,
    );
    return id!;
  });
  return { id: quoteId, subtotal, total };
}

export async function setQuoteStatusAction(data: {
  id: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
}) {
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]) })
    .parse(data);
  const user = await requireUser();
  const existing = (
    await query<{ status: string }>("SELECT status FROM quotes WHERE id = $1 AND user_id = $2", [
      parsed.id,
      user.id,
    ])
  )[0];
  if (!existing) throw new Error("Devis introuvable.");
  const allowed: Record<string, string[]> = {
    DRAFT: ["DRAFT", "SENT"],
    SENT: ["SENT", "ACCEPTED", "REJECTED"],
    ACCEPTED: ["ACCEPTED"],
    REJECTED: ["REJECTED", "SENT"],
  };
  if (!allowed[existing.status]?.includes(parsed.status))
    throw new Error("Transition de statut non autorisée.");
  await query(
    "UPDATE quotes SET status = $1, shared_at = CASE WHEN $1 = 'SENT' THEN now() ELSE shared_at END WHERE id = $2 AND user_id = $3",
    [parsed.status, parsed.id, user.id],
  );
  return { status: parsed.status };
}

export async function listQuotesAction() {
  const user = await requireUser();
  return query(
    "SELECT q.id, q.quote_number, q.status, q.issue_date, q.total, q.client_id, json_build_object('name', c.name) AS clients FROM quotes q JOIN clients c ON c.id = q.client_id WHERE q.user_id = $1 ORDER BY q.created_at DESC LIMIT 30",
    [user.id],
  );
}
export async function createClientQuickAction(data: z.infer<typeof clientInput>) {
  const parsed = clientInput.parse(data);
  const user = await requireUser();
  return (
    await query(
      "INSERT INTO clients (user_id, name, company_name, email, phone, city) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, company_name, city",
      [
        user.id,
        parsed.name,
        parsed.company_name || null,
        parsed.email || null,
        parsed.phone || null,
        parsed.city || null,
      ],
    )
  )[0];
}
