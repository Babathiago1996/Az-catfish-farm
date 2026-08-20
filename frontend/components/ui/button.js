"use client";
import { cn } from "@/lib/utils";

export function Button({ className, variant="default", size="default", type="button", ...props }) {
  const variants = {
    default: "bg-[var(--primary)] text-white shadow-sm hover:opacity-90",
    secondary: "bg-[var(--accent)] text-[var(--foreground)] hover:brightness-95",
    outline: "border border-[var(--border)] bg-[var(--card)] hover:bg-slate-50 dark:hover:bg-slate-800",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700"
  };
  const sizes = { sm:"h-9 px-3 text-sm", default:"h-10 px-4", lg:"h-11 px-5", icon:"h-10 w-10" };
  return <button type={type} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />;
}
