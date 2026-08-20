"use client";
import { useEffect } from "react";
export function Dialog({ open, onOpenChange, title, description, children }) {
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onOpenChange(false);
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onOpenChange]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]/95 px-6 py-5 backdrop-blur">
          <h2 className="text-xl font-bold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          )}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
