import { FAQ, FEATURES, SITE, SITE_URL } from "./site";

const FACTS = [
  "Price: free, no ads, no premium tier",
  "Currency: Philippine peso (₱)",
  "Platforms: any modern browser; installable as an app (PWA) on Android, iOS, Windows and macOS",
  "Sign-up: username and password only, no email; one-time recovery codes",
  "Works offline: entries sync when back online",
  "Wallets: cash, GCash, Maya, banks and cards (entered manually or imported from CSV; no bank login)",
  "Optional AI: runs in the browser (WebLLM) or on the user's computer (Ollama); data stays on device",
  "Export: CSV and full JSON backup; account deletion anytime",
];

const PAGES = [
  ["Home", "/", "What Oink is, features and FAQ"],
  ["Create an account", "/register", "Free sign-up, no email needed"],
  ["Sign in", "/login", "Access an existing account"],
  ["Privacy", "/privacy", "What is stored and how to export or delete it"],
] as const;

function header() {
  return `# ${SITE.name}

> ${SITE.description}`;
}

export function llmsSummary() {
  return `${header()}

## Key facts

${FACTS.map((f) => `- ${f}`).join("\n")}

## Pages

${PAGES.map(([t, p, d]) => `- [${t}](${SITE_URL}${p}): ${d}`).join("\n")}

## Optional

- [Full details](${SITE_URL}/llms-full.txt): every feature and answers to common questions
`;
}

export function llmsFull() {
  return `${header()}

${SITE.tagline}

## Key facts

${FACTS.map((f) => `- ${f}`).join("\n")}

## Features

${FEATURES.map((f) => `### ${f.title}\n\n${f.body}`).join("\n\n")}

### Pig health score

Oink's mascot pig has a 0–100 health score computed from the user's finances. Staying within budget, saving at least 20% of income, and having no overdue bills or debts keep it healthy and chubby. Going over budget, spending more than earned, a negative balance, a balance forecast to run out before payday, or overdue bills and debts make it thinner. Levels: Thriving (80+), Healthy (55–79), Getting thin (30–54), Starving (below 30).

### Pig badges

Reaching a total balance of ₱1,000, ₱5,000, ₱10,000, ₱25,000, ₱50,000, ₱100,000, ₱250,000 and ₱1,000,000 unlocks pig items: Sprout, Bandana, Coin charm, Cool shades, Ipon grad cap, Crown, Royal cape and Golden pig. Unlocks are based on the highest balance ever reached, so they are never taken away. The user can choose which earned item the pig wears.

### Budgeting

Budgets can be monthly or follow a pay cycle (for example the 15th and 30th). Oink shows a safe-to-spend amount per day until the next reset, reserving upcoming bills.

## Frequently asked questions

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Pages

${PAGES.map(([t, p, d]) => `- [${t}](${SITE_URL}${p}): ${d}`).join("\n")}
`;
}
