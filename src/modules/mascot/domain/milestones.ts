export const OUTFITS = [
  "sprout",
  "bandana",
  "coin",
  "shades",
  "grad",
  "crown",
  "royal",
  "golden",
] as const;

export type Outfit = (typeof OUTFITS)[number];

export type Milestone = { id: Outfit; amount: number; name: string; line: string };

// amounts in centavos
export const MILESTONES: readonly Milestone[] = [
  { id: "sprout", amount: 1_000_00, name: "Sprout", line: "Your first ₱1k! I'm growing! 🌱" },
  { id: "bandana", amount: 5_000_00, name: "Bandana", line: "₱5k saved! Look at my bandana!" },
  { id: "coin", amount: 10_000_00, name: "Coin charm", line: "₱10k! I'm a coin collector now!" },
  { id: "shades", amount: 25_000_00, name: "Cool shades", line: "₱25k… looking rich! 😎" },
  {
    id: "grad",
    amount: 50_000_00,
    name: "Ipon grad",
    line: "₱50k! I graduated from ipon school! 🎓",
  },
  { id: "crown", amount: 100_000_00, name: "Crowned", line: "Six digits! Bow to the pig! 👑" },
  { id: "royal", amount: 250_000_00, name: "Royal hog", line: "₱250k! Royal hog reporting! ✨" },
  {
    id: "golden",
    amount: 1_000_000_00,
    name: "Golden pig",
    line: "Milyonaryo! I turned to gold! 🏆",
  },
];

const BY_ID = Object.fromEntries(MILESTONES.map((m) => [m.id, m])) as Record<Outfit, Milestone>;

export const milestone = (id: Outfit) => BY_ID[id];

export type PigProgress = { best: number; outfit: Outfit | null; celebrated: number };

export const EMPTY_PROGRESS: PigProgress = { best: 0, outfit: null, celebrated: 0 };

export const unlockedCount = (best: number) => MILESTONES.filter((m) => best >= m.amount).length;

export const isOutfit = (v: unknown): v is Outfit => OUTFITS.some((o) => o === v);

export function isUnlocked(best: number, outfit: Outfit) {
  return best >= milestone(outfit).amount;
}

// best balance only goes up, so earned items are never taken away
export function advance(p: PigProgress, balance: number): PigProgress {
  const best = Math.max(p.best, Math.round(balance));
  const before = unlockedCount(p.best);
  const after = unlockedCount(best);
  const outfit = after > before ? (MILESTONES[after - 1]?.id ?? null) : p.outfit;
  return { best, outfit, celebrated: p.celebrated };
}

export function pendingUnlock(p: PigProgress): Milestone | null {
  const count = unlockedCount(p.best);
  return count > p.celebrated ? (MILESTONES[count - 1] ?? null) : null;
}

export function nextMilestone(p: PigProgress, balance: number) {
  const next = MILESTONES[unlockedCount(p.best)];
  if (!next) return null;
  const now = Math.max(0, balance);
  return {
    milestone: next,
    remaining: Math.max(0, next.amount - now),
    pct: Math.min(100, (now / next.amount) * 100),
  };
}
