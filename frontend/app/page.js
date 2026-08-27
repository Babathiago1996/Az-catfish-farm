"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Fish,
  ShieldCheck,
  Sparkles,
  Waves,
  TrendingUp,
  Phone,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

/*
 * Same pattern as the contact page: a fixed fallback so the
 * map link always works, even before/without the farm's
 * address being configured in Settings. If `farm.address`
 * is set, that's still what's displayed as text — this URL
 * just always points at the real farm location.
 */
const FARM_ADDRESS = "3 Olalere Street, Ikotun, Lagos";

const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  FARM_ADDRESS,
)}`;

export default function HomePage() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchHomeContent() {
      try {
        const response = await api.public.home();

        if (mounted) {
          setContent(response?.content || null);
        }
      } catch (error) {
        console.error("Failed to load public home content:", error);
      }
    }

    fetchHomeContent();

    return () => {
      mounted = false;
    };
  }, []);

  const farm = content?.farm;
  const overview = content?.overview || {};
  const gallery = content?.featuredGallery || [];

  const stats = [
    [Waves, "Active ponds", overview.totalActivePonds || 0],
    [Fish, "Fish in production", overview.totalFishCount || 0],
    [TrendingUp, "Biomass kg", overview.totalBiomassKg || 0],
    [ShieldCheck, "Quality mindset", "Daily"],
  ];

  const features = [
    [
      Fish,
      "Production-first",
      "Track fish populations, growth, mortality and biomass pond by pond.",
    ],
    [
      Waves,
      "Water-aware",
      "Keep water changes, parameters, pump status and maintenance visible.",
    ],
    [
      TrendingUp,
      "Business-minded",
      "Connect sales, customers, expenses and inventory to the production story.",
    ],
  ];

  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1544550285-f813152fb2fd?auto=format&fit=crop&w=2200&q=85')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-blue-950/30" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Smarter catfish farming, beautifully managed
            </div>

            <h1 className="max-w-3xl text-balance text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Healthy fish.{" "}
              <span className="text-cyan-300">Better systems.</span> Stronger
              harvests.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              {farm?.about ||
                "AZ Fish Farm combines disciplined production, water care, feeding intelligence and dependable customer service into one modern farming operation."}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-slate-950 hover:bg-slate-100"
              >
                Talk to the farm
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/overview"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 font-bold text-white backdrop-blur hover:bg-white/10"
              >
                Explore the farm
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
              {farm?.phone && (
                <a
                  href={`tel:${farm.phone}`}
                  className="inline-flex items-center gap-2 hover:text-cyan-300"
                >
                  <Phone className="h-4 w-4 text-cyan-300" />
                  {farm.phone}
                </a>
              )}

              {farm?.address && (
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-cyan-300"
                >
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  {farm.address}
                </a>
              )}
            </div>
          </motion.div>

          {/* FARM SNAPSHOT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-[3rem] bg-cyan-400/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[1.5rem] bg-slate-900/80 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[.2em] text-slate-500">
                      Live farm snapshot
                    </div>

                    <div className="mt-1 text-xl font-black">
                      Production at a glance
                    </div>
                  </div>

                  <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                    <Fish />
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  {stats.map(([Icon, label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/[.03] p-4"
                    >
                      <Icon className="h-5 w-5 text-cyan-300" />

                      <div className="mt-5 text-2xl font-black">
                        {typeof value === "number"
                          ? formatNumber(value, 3)
                          : value}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    Farm operations monitored with one connected system
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">
            What makes the farm different
          </div>

          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            A farm operation designed around consistency.
          </h2>

          <p className="mt-4 leading-7 text-[var(--muted)]">
            From stocking to sales, every important activity has a place. That
            creates better visibility, cleaner decisions and a more dependable
            farming rhythm.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(([Icon, title, copy]) => (
            <motion.div
              key={title}
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7 shadow-sm"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <Icon />
              </div>

              <h3 className="mt-6 text-xl font-black">{title}</h3>

              <p className="mt-2 leading-7 text-[var(--muted)]">{copy}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section className="border-y border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">
                From the farm
              </div>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                A glimpse into AZ Fish Farm
              </h2>
            </div>

            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
            >
              View full gallery
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.slice(0, 4).map((item, index) => (
              <motion.div
                key={item._id || index}
                whileHover={{ y: -4 }}
                className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--background)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-200">
                  <img
                    src={item.imageUrl}
                    alt={item.title || "AZ Fish Farm"}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {item.category}
                  </div>

                  <div className="mt-1 font-bold">{item.title}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 to-cyan-600 p-8 text-white shadow-xl sm:p-12">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-semibold text-blue-100">
                Ready when you are
              </div>

              <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
                Good fish starts with good farm discipline.
              </h2>
            </div>

            <Link
              href="/contact"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-5 font-bold text-blue-700"
            >
              Contact AZ Fish Farm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
