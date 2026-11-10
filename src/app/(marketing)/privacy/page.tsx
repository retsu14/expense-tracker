import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Oink stores, what it doesn't, and how to export or delete your data.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "What we store",
    body: [
      "Your username, a hashed password and one-time recovery codes. No email or phone number.",
      "The wallets, categories, transactions, budgets, bills, goals and debts you add.",
      "An optional profile photo, stored privately and shown only to you.",
      "Your pig's badges and the highest balance you've reached, so badges stay earned.",
    ],
  },
  {
    title: "What we don't do",
    body: [
      "We don't connect to your bank or e-wallet logins.",
      "We don't sell your data or show ads.",
      "The optional AI runs in your browser or on your own computer through Ollama. Your finances aren't sent to an AI company.",
    ],
  },
  {
    title: "On your device",
    body: [
      "Settings like theme, sound and the optional PIN lock stay in your browser.",
      "Entries logged offline wait on your device until they sync.",
    ],
  },
  {
    title: "Your control",
    body: [
      "Export your transactions as CSV or a full JSON backup in Settings.",
      "Delete your account anytime. Your data is removed immediately.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto grid max-w-2xl gap-8 px-4 py-14 md:px-6">
      <header>
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-2 text-h1">Your money stays yours</h1>
        <p className="mt-3 text-body text-fg-muted">
          Oink keeps only what it needs to track your money for you.
        </p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.title} className="grid gap-3">
          <h2 className="text-h2">{s.title}</h2>
          <ul className="grid list-disc gap-2 pl-5 text-body text-fg-muted marker:text-fg-muted">
            {s.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
