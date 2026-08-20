import { cn } from "@/lib/utils";
export function Input({ className, ...props }) { return <input className={cn("h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-500/10", className)} {...props} />; }
