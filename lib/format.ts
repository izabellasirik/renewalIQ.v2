import { format, isTomorrow, isToday } from "date-fns";

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return format(d, sameYear ? "MMM d" : "MMM d, yyyy");
}

export function formatLongDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMMM d");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatFriendlyDueDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Due today";
  if (isTomorrow(d)) return "Tomorrow";
  return formatShortDate(d);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd");
}

/** Parses a `<input type="date">` value ("YYYY-MM-DD") as local midnight. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}
