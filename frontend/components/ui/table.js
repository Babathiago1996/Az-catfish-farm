import { cn } from "@/lib/utils";
export function Table({ children, className }) { return <div className="overflow-x-auto rounded-2xl border border-[var(--border)]"><table className={cn("w-full text-left text-sm", className)}>{children}</table></div>; }
export const THead=({children})=><thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/70">{children}</thead>;
export const TBody=({children})=><tbody className="divide-y divide-[var(--border)]">{children}</tbody>;
export const TR=({children,className})=><tr className={cn("transition hover:bg-slate-50/60 dark:hover:bg-slate-900/50",className)}>{children}</tr>;
export const TH=({children,className})=><th className={cn("px-4 py-3 font-semibold",className)}>{children}</th>;
export const TD=({children,className})=><td className={cn("px-4 py-3.5 align-middle",className)}>{children}</td>;
