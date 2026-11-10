import {
  ArrowRight,
  CalendarClock,
  ChartPie,
  Heart,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BadgeParade, HealthStates, HeroPig } from "@/components/marketing/marketing-pigs";
import { Button } from "@/components/ui/button";
import { FAQ, FEATURES, SITE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const ICONS = [Sparkles, Target, CalendarClock, ChartPie, Heart, ShieldCheck];

const STEPS = [
  { title: "Add your wallets", body: "Cash, GCash, Maya or your bank, with today’s balances." },
  { title: "Log as you go", body: "Type it, tap a favorite, or import a CSV." },
  { title: "Follow your pig", body: "Stay in budget and watch it get happy and chubby." },
];

function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "en-PH",
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE.name,
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE.name,
        url: SITE_URL,
        description: SITE.description,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android, iOS, Windows, macOS",
        browserRequirements: "Requires a modern browser with JavaScript",
        inLanguage: "en-PH",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" },
        image: `${SITE_URL}/opengraph-image`,
        screenshot: `${SITE_URL}/screens/home-desktop.jpg`,
        featureList: FEATURES.map((f) => f.title),
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function WelcomePage() {
  return (
    <>
      <JsonLd />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-radial-[at_70%_20%] from-pig/15 to-transparent to-60%"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:pt-16 md:pb-20">
          <div className="grid gap-6 text-center md:text-left">
            <p className="eyebrow">Free · Made for pesos</p>
            <h1 className="text-[clamp(2.25rem,1.4rem+4vw,4rem)] leading-[1.02] font-bold tracking-[-0.035em]">
              Track every peso.{" "}
              <span className="font-brand font-semibold text-pig-ink">Keep your pig happy.</span>
            </h1>
            <p className="mx-auto max-w-xl text-body text-fg-muted md:mx-0 md:text-[1.125rem] md:leading-7">
              {SITE.name} is a free expense and budget tracker for the Philippines. Log spending in
              seconds, plan ahead, and watch your pig get healthier as your money does.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Button asChild size="lg">
                <Link href="/register">
                  Get started free <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <p className="text-caption text-fg-muted">
              No email needed · Works offline · Installable app
            </p>
          </div>
          <HeroPig />
        </div>
      </section>

      <section aria-label="App preview" className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex items-end justify-center gap-4">
          <Image
            src="/screens/home-desktop.jpg"
            alt="Oink home screen with the pig's health, safe-to-spend amount and budgets"
            width={800}
            height={519}
            sizes="(min-width: 768px) 720px, 100vw"
            className="hidden w-full max-w-3xl rounded-xl border border-border shadow-2xl md:block"
            priority
          />
          <Image
            src="/screens/home-mobile.jpg"
            alt="Oink on a phone: the pig says the budget is getting tight"
            width={375}
            height={812}
            sizes="(min-width: 768px) 220px, 70vw"
            className="w-[70%] max-w-[16rem] rounded-[1.75rem] border border-border shadow-2xl md:-ml-24 md:w-56"
          />
        </div>
      </section>

      <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <h2 id="features" className="text-center text-h1">
          Everything your money needs
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = ICONS[i] ?? Sparkles;
            return (
              <li key={f.title} className="rounded-xl border border-border bg-surface p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-pig/15 text-pig-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-h3">{f.title}</h3>
                <p className="mt-1 text-body-sm text-fg-muted">{f.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="pig" className="bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 id="pig" className="text-center text-h1">
            Your pig mirrors your money
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-body text-fg-muted">
            Stay in budget and pay bills on time, and it thrives. Overspend, and it gets thin.
          </p>
          <div className="mt-10">
            <HealthStates />
          </div>
        </div>
      </section>

      <section aria-labelledby="badges" className="mx-auto max-w-6xl px-4 pt-20 md:px-6">
        <h2 id="badges" className="text-center text-h1">
          Save more, dress it up
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body text-fg-muted">
          Every balance milestone unlocks something new, from a sprout at ₱1,000 to a golden pig at
          ₱1M. Tap them.
        </p>
        <div className="mt-10">
          <BadgeParade />
        </div>
      </section>

      <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <h2 id="how" className="text-center text-h1">
          Set up in a minute
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-border bg-surface p-5">
              <span className="font-brand text-h2 text-pig-ink">{i + 1}</span>
              <h3 className="mt-2 text-h3">{s.title}</h3>
              <p className="mt-1 text-body-sm text-fg-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq" className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <h2 id="faq" className="text-center text-h1">
          Questions
        </h2>
        <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                <span className="text-h3">{f.q}</span>
                <span
                  aria-hidden
                  className="text-h2 text-fg-muted transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-body-sm text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <div className="grid justify-items-center gap-5 rounded-2xl border border-border bg-linear-to-br from-pig/15 to-surface px-6 py-12 text-center">
          <h2 className="text-h1">Give your pig a good life</h2>
          <p className="max-w-md text-body text-fg-muted">Free, private, and ready in a minute.</p>
          <Button asChild size="lg">
            <Link href="/register">
              Create your account <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
