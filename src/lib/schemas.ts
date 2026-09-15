import { z } from "zod";

export const clientInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Le nom du client est obligatoire").max(160),
  company_name: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().email("Email invalide").optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type ClientInput = z.infer<typeof clientInput>;

export const quoteItemInput = z.object({
  description: z.string().trim().min(1, "La désignation est obligatoire").max(300),
  quantity: z
    .number()
    .positive("La quantité doit être supérieure à zéro")
    .max(999_999.999, "La quantité est trop élevée"),
  unit_price: z
    .number()
    .min(0, "Le prix unitaire ne peut pas être négatif")
    .max(99_999_999.99, "Le prix unitaire est trop élevé"),
});

export const quoteInput = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid("Sélectionnez un client"),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(quoteItemInput).min(1, "Ajoutez au moins une prestation"),
});
export type QuoteInput = z.infer<typeof quoteInput>;

export const profileInput = z.object({
  full_name: z.string().trim().max(160).default(""),
  business_name: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(60).optional().nullable(),
  email: z.string().trim().max(160).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  tax_identifier: z.string().trim().max(120).optional().nullable(),
  logo_url: z.string().trim().max(600).optional().nullable(),
  currency: z.enum(["XOF", "XAF", "EUR", "USD"]).default("XOF"),
  quote_terms: z.string().trim().max(2000).optional().nullable(),
});
export type ProfileInput = z.infer<typeof profileInput>;

export const periodInput = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine(({ from, to }) => from <= to, "La période est invalide");
