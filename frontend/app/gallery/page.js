"use client";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { api } from "@/lib/api";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { Select } from "@/components/ui/select";
import { labelize } from "@/lib/utils";

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /*
     * Fix: previously `items` started as `[]`, and the
     * "No public gallery images are available yet" message
     * only checked `!items.length` — which is true for the
     * whole stretch between mount and the API response
     * actually arriving. That made the empty-state message
     * flash first, then get replaced by real images once
     * they loaded, which looked broken.
     *
     * Tracking `loading` explicitly means the empty-state
     * message only ever renders once we genuinely know
     * there are no images, not while we're still waiting
     * to find out.
     */
    setLoading(true);

    api.public
      .gallery(category ? { category } : {})
      .then((r) => setItems(r?.galleries || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <PublicShell>
      <section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">
                Gallery
              </div>
              <h1 className="mt-3 text-5xl font-black tracking-tight">
                Life around the farm.
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">
                A visual record of ponds, fish, feeding, growth and the work
                behind the harvest.
              </p>
            </div>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full md:w-52"
            >
              <option value="">All categories</option>
              {GALLERY_CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {labelize(x)}
                </option>
              ))}
            </Select>
          </div>

          {loading ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-3xl border bg-[var(--card)]"
                >
                  <div className="aspect-[4/3] animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2 p-5">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {items.length > 0 && (
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <article
                      key={item._id}
                      className="group overflow-hidden rounded-3xl border bg-[var(--card)]"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-slate-200">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <div className="text-xs font-bold uppercase tracking-wide text-blue-600">
                          {labelize(item.category)}
                        </div>
                        <h2 className="mt-1 text-lg font-black">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {item.description}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {!items.length && (
                <div className="mt-10 rounded-3xl border border-dashed p-14 text-center text-sm text-[var(--muted)]">
                  No public gallery images are available yet.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
