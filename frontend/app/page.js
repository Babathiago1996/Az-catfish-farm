"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Fish,
  ShieldCheck,
  Sparkles,
  Waves,
  TrendingUp,
  Phone,
  MapPin,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
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

/*
 * Shared scroll-reveal animation for sections below the
 * fold. `viewport={{ once: true }}` means it only plays the
 * first time each section scrolls into view, not every time
 * you scroll past it — restrained rather than gimmicky.
 */
const revealUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export default function HomePage() {
  const [content, setContent] = useState(null);

  /*
   * Which featured-gallery image (by index) is open in the
   * lightbox. null means the lightbox is closed.
   */
  const [lightboxIndex, setLightboxIndex] = useState(null);

  /*
   * Drives the slow "Ken Burns" zoom on the currently open
   * lightbox image: starts at normal scale, then transitions
   * up to a slight zoom over several seconds via a plain CSS
   * transition, restarting on every image change.
   */
  const [kenBurns, setKenBurns] = useState(false);

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
  const featuredGallery = gallery.slice(0, 4);

  /*
   * Restart the Ken Burns zoom every time the lightbox opens
   * or moves to a different image.
   */
  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    setKenBurns(false);

    const timer = setTimeout(() => setKenBurns(true), 60);

    return () => clearTimeout(timer);
  }, [lightboxIndex]);

  const closeLightbox = () => setLightboxIndex(null);

  const showPrevImage = () =>
    setLightboxIndex((current) =>
      current === null
        ? null
        : (current - 1 + featuredGallery.length) % featuredGallery.length,
    );

  const showNextImage = () =>
    setLightboxIndex((current) =>
      current === null ? null : (current + 1) % featuredGallery.length,
    );

  /*
   * Keyboard navigation while the lightbox is open:
   * Escape to close, arrow keys to move between images.
   */
  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPrevImage();
      if (event.key === "ArrowRight") showNextImage();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, featuredGallery.length]);

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
                href="/gallery"
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
        <motion.div
          initial={revealUp.initial}
          whileInView={revealUp.whileInView}
          viewport={revealUp.viewport}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
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
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(([Icon, title, copy], index) => (
            <motion.div
              key={title}
              initial={revealUp.initial}
              whileInView={revealUp.whileInView}
              viewport={revealUp.viewport}
              transition={{ duration: 0.5, delay: index * 0.1 }}
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
          <motion.div
            initial={revealUp.initial}
            whileInView={revealUp.whileInView}
            viewport={revealUp.viewport}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-between gap-5 md:flex-row md:items-end"
          >
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
          </motion.div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredGallery.map((item, index) => (
              <motion.button
                key={item._id || index}
                type="button"
                onClick={() => setLightboxIndex(index)}
                initial={revealUp.initial}
                whileInView={revealUp.whileInView}
                viewport={revealUp.viewport}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="group block overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--background)] text-left"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                  <img
                    src={item.imageUrl}
                    alt={item.title || "AZ Fish Farm"}
                    className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                  />

                  {/*
                   * Hover overlay signals the image is
                   * clickable, matching the "view larger"
                   * affordance pattern used in the admin
                   * mortality gallery elsewhere in the app.
                   */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur">
                      <Maximize2 className="h-3.5 w-3.5" />
                      View
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {item.category}
                  </div>

                  <div className="mt-1 font-bold">{item.title}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY LIGHTBOX */}
      <AnimatePresence>
        {lightboxIndex !== null && featuredGallery[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-5 top-5 z-20 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {featuredGallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    showPrevImage();
                  }}
                  className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:left-8"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    showNextImage();
                  }}
                  className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:right-8"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-h-[85vh] max-w-5xl overflow-hidden rounded-2xl shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/*
               * The slow zoom ("Ken Burns" effect) is a
               * plain CSS transition: the image starts at
               * normal scale, then `kenBurns` flips true a
               * beat after mount, transitioning it up to a
               * gentle zoom over several seconds for a
               * cinematic, gallery-quality feel.
               */}
              <img
                src={featuredGallery[lightboxIndex].imageUrl}
                alt={featuredGallery[lightboxIndex].title || "AZ Fish Farm"}
                className={`max-h-[85vh] w-full object-contain transition-transform duration-[9000ms] ease-out ${
                  kenBurns ? "scale-110" : "scale-100"
                }`}
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-16">
                <div className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  {featuredGallery[lightboxIndex].category}
                </div>

                <div className="mt-1 text-lg font-black text-white">
                  {featuredGallery[lightboxIndex].title}
                </div>
              </div>
            </motion.div>

            {featuredGallery.length > 1 && (
              <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white backdrop-blur">
                {lightboxIndex + 1} / {featuredGallery.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.section
        initial={revealUp.initial}
        whileInView={revealUp.whileInView}
        viewport={revealUp.viewport}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
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
      </motion.section>
    </PublicShell>
  );
}
