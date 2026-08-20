import { cn } from "@/lib/utils";
export function Select({ className, children, ...props }) { return <select className={cn("h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--primary)]", className)} {...props}>{children}</select>; }
