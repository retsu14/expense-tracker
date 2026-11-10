export const SITE_URL = (
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE = {
  name: "Oink",
  title: "Oink — Free Expense & Budget Tracker for the Philippines",
  tagline: "Track every peso. Keep your pig happy.",
  description:
    "Oink is a free expense and budget tracker in pesos. Log spending in seconds, plan budgets, bills and savings goals, and keep your pig healthy. Works offline, with optional private AI.",
  locale: "en_PH",
  keywords: [
    "expense tracker Philippines",
    "budget app pesos",
    "budget planner",
    "money tracker",
    "GCash expense tracker",
    "utang tracker",
    "savings goals",
    "savings badges",
    "bills reminder",
    "personal finance app",
    "offline budget app",
  ],
} as const;

export const FEATURES = [
  {
    title: "Log in seconds",
    body: "Type “lunch 150 gcash” and it fills itself. Split bills, tag, and undo anytime.",
  },
  {
    title: "Budgets that think ahead",
    body: "Monthly or pay-cycle budgets with a safe-to-spend amount for today.",
  },
  {
    title: "Bills, goals and utang",
    body: "Reminders before due dates, savings goals, and money you lent or borrowed.",
  },
  {
    title: "Clear insights",
    body: "Where your money went, trends, a 30-day forecast and a monthly recap.",
  },
  {
    title: "A pig that cares",
    body: "Your pig gets chubby when your money is healthy and thin when it isn’t.",
  },
  {
    title: "Private by design",
    body: "Optional AI runs on your device. Works offline. No email needed.",
  },
] as const;

export const FAQ = [
  {
    q: "Is Oink free?",
    a: "Yes. Oink is free to use, with no ads and no premium tier.",
  },
  {
    q: "Does Oink work with GCash, Maya and banks?",
    a: "Yes. Add any wallet (cash, GCash, Maya, BPI, BDO and others) and track balances and transfers between them. You log entries yourself or import a CSV; Oink does not connect to your bank login.",
  },
  {
    q: "How does the pig's health work?",
    a: "The pig gets a 0–100 score from your finances: staying within budget, saving part of your income and paying bills on time keep it healthy. Overspending, overdue bills or a negative balance make it thinner.",
  },
  {
    q: "What are pig badges?",
    a: "As your total balance reaches ₱1,000, ₱5,000, ₱10,000, ₱25,000, ₱50,000, ₱100,000, ₱250,000 and ₱1,000,000, your pig earns a new item: a sprout, bandana, coin charm, shades, grad cap, crown, royal cape and finally a golden coat. Badges are kept even if your balance drops later.",
  },
  {
    q: "Can I use Oink offline?",
    a: "Yes. Install it as an app from your browser. Entries you log offline sync automatically when you are back online.",
  },
  {
    q: "Is my data private?",
    a: "Your data is only visible to your account. The optional AI runs in your browser or on your own computer through Ollama, so your finances are not sent to an AI company.",
  },
  {
    q: "Do I need an email to sign up?",
    a: "No. Sign up with a username and password. You get one-time recovery codes in case you forget your password.",
  },
  {
    q: "Can I track money I lent or borrowed (utang)?",
    a: "Yes. Track who owes you and who you owe, record partial payments, and see what is still due.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Export transactions to CSV or a full JSON backup at any time, and delete your account whenever you want.",
  },
] as const;
