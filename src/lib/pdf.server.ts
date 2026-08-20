import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatMoney, formatQuantity } from "./money";
import { formatDateLong } from "./format";

export type PdfLine = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PdfPayload = {
  kind: "DEVIS" | "FACTURE";
  number: string;
  issue_date: string;
  valid_until?: string | null;
  statusLabel: string;
  paidAt?: string | null;
  quoteRef?: string | null;
  notes?: string | null;
  currency: string;
  artisan: {
    business_name?: string | null;
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    tax_identifier?: string | null;
    quote_terms?: string | null;
  };
  client: {
    name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  };
  items: PdfLine[];
  total: number;
};

const INK = rgb(0.13, 0.15, 0.2);
const SOFT = rgb(0.45, 0.48, 0.55);
const LINE = rgb(0.86, 0.88, 0.92);
const BRAND = rgb(0.22, 0.33, 0.72);

/** pdf-lib StandardFonts encodent en WinAnsi : on retire les caractères hors table. */
function safe(text: string): string {
  return (text ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u202F|\u00A0|\u2009/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u20AC]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
  const t = safe(text);
  page.drawText(t, { x: x - font.widthOfTextAtSize(t, size), y, size, font, color });
}

export async function buildDocumentPdf(payload: PdfPayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89;
  const M = 48;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
  };

  // ---- Bandeau
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BRAND });

  const a = payload.artisan;
  const businessName = a.business_name || a.full_name || "Mon activite";
  page.drawText(safe(businessName), { x: M, y: y - 14, size: 16, font: bold, color: INK });
  y -= 32;

  const contactLines = [
    [a.address, a.city].filter(Boolean).join(", "),
    [a.phone, a.email].filter(Boolean).join(" · "),
    a.tax_identifier ? `N° fiscal : ${a.tax_identifier}` : "",
  ].filter(Boolean) as string[];
  for (const l of contactLines) {
    page.drawText(safe(l), { x: M, y, size: 9, font: regular, color: SOFT });
    y -= 12;
  }

  // ---- Titre document (colonne droite)
  let ry = H - M - 6;
  drawRight(page, payload.kind, W - M, ry - 12, bold, 26, BRAND);
  ry -= 34;
  drawRight(page, payload.number, W - M, ry, bold, 11);
  ry -= 14;
  drawRight(page, `Date : ${formatDateLong(payload.issue_date)}`, W - M, ry, regular, 9, SOFT);
  ry -= 12;
  if (payload.valid_until) {
    drawRight(page, `Valable jusqu'au ${formatDateLong(payload.valid_until)}`, W - M, ry, regular, 9, SOFT);
    ry -= 12;
  }
  if (payload.quoteRef) {
    drawRight(page, `Issue du devis ${payload.quoteRef}`, W - M, ry, regular, 9, SOFT);
    ry -= 12;
  }
  drawRight(page, `Statut : ${payload.statusLabel}`, W - M, ry, bold, 9, SOFT);

  y = Math.min(y, ry) - 26;

  // ---- Client
  page.drawText("DESTINATAIRE", { x: M, y, size: 8, font: bold, color: SOFT });
  y -= 14;
  page.drawText(safe(payload.client.name), { x: M, y, size: 12, font: bold, color: INK });
  y -= 14;
  const clientLines = [
    payload.client.company_name ?? "",
    [payload.client.address, payload.client.city].filter(Boolean).join(", "),
    [payload.client.phone, payload.client.email].filter(Boolean).join(" · "),
  ].filter(Boolean) as string[];
  for (const l of clientLines) {
    page.drawText(safe(l), { x: M, y, size: 9, font: regular, color: SOFT });
    y -= 12;
  }

  y -= 16;

  // ---- Tableau
  const colDesc = M;
  const colQty = 330;
  const colUnit = 420;
  const colTotal = W - M;

  const header = () => {
    page.drawRectangle({ x: M - 8, y: y - 6, width: W - 2 * M + 16, height: 22, color: rgb(0.96, 0.97, 0.99) });
    page.drawText("DESIGNATION", { x: colDesc, y, size: 8, font: bold, color: SOFT });
    drawRight(page, "QTE", colQty + 30, y, bold, 8, SOFT);
    drawRight(page, "PRIX UNITAIRE", colUnit + 60, y, bold, 8, SOFT);
    drawRight(page, "TOTAL", colTotal, y, bold, 8, SOFT);
    y -= 20;
  };
  header();

  for (const item of payload.items) {
    const lines = wrap(item.description, regular, 10, colQty - colDesc - 16);
    const blockHeight = Math.max(18, lines.length * 12 + 8);
    if (y - blockHeight < M + 140) {
      newPage();
      header();
    }
    let ly = y;
    for (const l of lines) {
      page.drawText(l, { x: colDesc, y: ly, size: 10, font: regular, color: INK });
      ly -= 12;
    }
    drawRight(page, formatQuantity(item.quantity), colQty + 30, y, regular, 10);
    drawRight(page, formatMoney(item.unit_price, payload.currency), colUnit + 60, y, regular, 10);
    drawRight(page, formatMoney(item.line_total, payload.currency), colTotal, y, bold, 10);
    y -= blockHeight;
    page.drawLine({
      start: { x: M, y: y + 6 },
      end: { x: W - M, y: y + 6 },
      thickness: 0.5,
      color: LINE,
    });
  }

  // ---- Totaux
  y -= 18;
  if (y < M + 110) newPage();
  drawRight(page, "Sous-total", colUnit + 60, y, regular, 10, SOFT);
  drawRight(page, formatMoney(payload.total, payload.currency), colTotal, y, regular, 10);
  y -= 22;
  page.drawRectangle({
    x: colUnit - 60,
    y: y - 10,
    width: W - M - (colUnit - 60),
    height: 30,
    color: rgb(0.96, 0.97, 0.99),
  });
  drawRight(page, "TOTAL", colUnit + 60, y, bold, 12, INK);
  drawRight(page, formatMoney(payload.total, payload.currency), colTotal, y, bold, 14, BRAND);
  y -= 40;

  if (payload.kind === "FACTURE" && payload.paidAt) {
    page.drawText(safe(`PAYEE le ${formatDateLong(payload.paidAt)}`), {
      x: M,
      y,
      size: 12,
      font: bold,
      color: rgb(0.1, 0.5, 0.35),
    });
    y -= 22;
  }

  const footNotes = [payload.notes, payload.artisan.quote_terms].filter(Boolean) as string[];
  for (const note of footNotes) {
    for (const l of wrap(note, regular, 9, W - 2 * M)) {
      if (y < M + 30) newPage();
      page.drawText(l, { x: M, y, size: 9, font: regular, color: SOFT });
      y -= 11;
    }
    y -= 6;
  }

  page.drawText(safe(`${businessName}${a.city ? " · " + a.city : ""}`), {
    x: M,
    y: M - 16,
    size: 8,
    font: regular,
    color: SOFT,
  });

  return pdf.save();
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
