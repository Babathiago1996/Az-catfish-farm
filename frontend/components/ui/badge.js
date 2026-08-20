import { cn, labelize } from "@/lib/utils";
export function Badge({ value, className }) { return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>{labelize(value)}</span>; }
export function StatusBadge({ status }) {
  const map = { active:"border-emerald-200 bg-emerald-50 text-emerald-700", paid:"border-emerald-200 bg-emerald-50 text-emerald-700", completed:"border-emerald-200 bg-emerald-50 text-emerald-700", inactive:"border-slate-200 bg-slate-100 text-slate-600", empty:"border-slate-200 bg-slate-100 text-slate-600", pending:"border-amber-200 bg-amber-50 text-amber-700", partial:"border-blue-200 bg-blue-50 text-blue-700", maintenance:"border-orange-200 bg-orange-50 text-orange-700", overdue:"border-red-200 bg-red-50 text-red-700", due:"border-amber-200 bg-amber-50 text-amber-700", upcoming:"border-blue-200 bg-blue-50 text-blue-700", faulty:"border-red-200 bg-red-50 text-red-700", cancelled:"border-red-200 bg-red-50 text-red-700", critical:"border-red-200 bg-red-50 text-red-700" };
  return <Badge value={status} className={map[status] || "border-slate-200 bg-slate-50 text-slate-700"} />;
}
