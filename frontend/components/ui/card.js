import { cn } from "@/lib/utils";
export function Card({ className, ...props }) { return <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm", className)} {...props} />; }
export function CardHeader({ className, ...props }) { return <div className={cn("p-5 pb-3", className)} {...props} />; }
export function CardTitle({ className, ...props }) { return <h3 className={cn("text-base font-bold tracking-tight", className)} {...props} />; }
export function CardDescription({ className, ...props }) { return <p className={cn("mt-1 text-sm text-[var(--muted)]", className)} {...props} />; }
export function CardContent({ className, ...props }) { return <div className={cn("p-5 pt-2", className)} {...props} />; }
