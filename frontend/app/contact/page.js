"use client";

import { useEffect, useState } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { api } from "@/lib/api";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

/*
 * Farm contact constants.
 *
 * These are used as sensible defaults/fallbacks so the
 * contact links always work even before (or without) the
 * farm's phone/address being configured in Settings. If
 * `data.phone` / `data.address` come back from the API,
 * those take priority.
 */
const FARM_PHONE = "+2348132068339";
const FARM_WHATSAPP_NUMBER = "2348132068339";
const FARM_ADDRESS = "10 Olalere Street, Ikotun, Lagos";

const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  FARM_ADDRESS,
)}`;

const WHATSAPP_URL = `https://wa.me/${FARM_WHATSAPP_NUMBER}`;

const gmailComposeUrl = (email) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

export default function Contact() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.public
      .contact()
      .then((r) => setData(r?.contact))
      .catch(() => {});
  }, []);

  const phone = data?.phone || FARM_PHONE;
  const email = data?.email || "";
  const address = data?.address || FARM_ADDRESS;

  return (
    <PublicShell>
      <section className="mesh-bg">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">
              Contact
            </div>
            <h1 className="mt-3 text-5xl font-black tracking-tight">
              Let’s talk fish, supply and farm services.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              Reach the farm directly using the details below.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              [
                Phone,
                "Phone",
                phone,
                `tel:${phone}`,
                false,
              ],
              [
                Mail,
                "Email",
                email,
                email ? gmailComposeUrl(email) : null,
                true,
              ],
              [
                MapPin,
                "Farm address",
                address,
                GOOGLE_MAPS_URL,
                true,
              ],
            ].map(([Icon, title, value, href, external]) => (
              <div
                key={title}
                className="rounded-3xl border bg-[var(--card)] p-7 shadow-sm"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                  <Icon />
                </div>
                <h3 className="mt-5 font-black">{title}</h3>
                {href ? (
                  <a
                    href={href}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="mt-2 block text-sm font-semibold text-blue-600"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">{value}</p>
                )}
              </div>
            ))}
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 block rounded-3xl border bg-[var(--card)] p-7 transition hover:border-emerald-400 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="text-emerald-600" />
              <div>
                <div className="font-black">Prefer WhatsApp?</div>
                <div className="text-sm text-[var(--muted)]">
                  Chat with the farm directly on WhatsApp — tap here to start
                  a conversation.
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>
    </PublicShell>
  );
}