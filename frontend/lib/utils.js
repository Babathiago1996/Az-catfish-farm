import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) { return twMerge(clsx(inputs)); }
export function formatCurrency(value, currency = "NGN") {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(number);
}
export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: digits }).format(Number(value || 0));
}
export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", ...options }).format(date);
}
export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }).format(date);
}
export function toInputDate(value = new Date()) {
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function labelize(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
export function initials(name = "AZ") { return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "AZ"; }
export function getErrorMessage(error) { return error?.message || "Unable to complete this action."; }
export function getId(item) { return item?._id || item?.id || ""; }
export function pondName(pond) { return pond?.name || pond?.pondName || pond?.pondNumber || "Unknown pond"; }
