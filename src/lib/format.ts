const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "20 août 2026" */
export function formatDateLong(value?: string | Date | null): string {
  if (!value) return "—";
  const d = parseDateOnly(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "20/08/2026" */
export function formatDateShort(value?: string | Date | null): string {
  if (!value) return "—";
  const d = parseDateOnly(value);
  return d.toLocaleDateString("fr-FR");
}

export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isExpired(validUntil?: string | null): boolean {
  if (!validUntil) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDateOnly(validUntil).getTime() < today.getTime();
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
