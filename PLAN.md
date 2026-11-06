# Oink — Expense & Budget Tracker (Plan v3)

> v3: full feature set with priorities (§12), engineering standards incl. keyset pagination + server-side search (§13), phases (§14).

PWA for mobile + desktop. Track expenses/income, plan budgets, save toward goals, see stats, with an interactive pink pig mascot and an **optional** local AI.

**Decided:** currency PHP (₱), one currency per user · AI = WebLLM default + Ollama with model picker · pig + app name "Oink" · Neon + R2 already provisioned · dev in Docker · forgot password via username + recovery code.

---

## 1. Stack

| Layer        | Choice                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Framework    | Next.js 16 App Router, fullstack (Server Actions + Route Handlers)                                    |
| Language     | TypeScript strict                                                                                     |
| Backend      | DDD, bounded contexts (§4)                                                                            |
| DB / ORM     | Neon Postgres (`@neondatabase/serverless`) + Drizzle + drizzle-kit                                    |
| Client state | Zustand + `persist`                                                                                   |
| Validation   | Zod (shared by forms + use cases)                                                                     |
| UI           | Tailwind v4, shadcn/ui (Radix), lucide icons, Motion, Recharts, vaul (mobile sheets), sonner (toasts) |
| Theme        | next-themes: Dark (default) / Light / System                                                          |
| Auth         | Username + password. Argon2id (`@node-rs/argon2`), DB sessions, httpOnly cookie                       |
| Media        | Cloudflare R2, presigned PUT (`@aws-sdk/client-s3`)                                                   |
| PWA          | `app/manifest.ts` + custom service worker                                                             |
| AI           | Optional: WebLLM (in-browser) or Ollama (localhost)                                                   |
| Dev          | Docker (`docker-compose.yaml`), `.env` via `env_file`                                                 |

Next 16: `proxy.ts` (not middleware), async `params`/`cookies()`, Turbopack default. Read `node_modules/next/dist/docs/` before coding.

---

## 2. UI/UX standards

### 2.1 Principles

1. **Logging an expense takes ≤ 3 taps / 5 seconds.** Quick-add is reachable from every screen.
2. **One primary action per screen.** Ivory (accent) is reserved for it — never decorative.
3. **Numbers first.** Money is the content; chrome stays quiet.
4. **Pig = feedback, not noise.** It reacts to user actions and budget state; never blocks a task.
5. **Every state designed:** loading (skeletons), empty (pig + one CTA), error (plain message + retry), offline (banner), success (toast + pig).

### 2.2 Accessibility (WCAG 2.2 AA)

- Text contrast ≥ 4.5:1, large text/icons ≥ 3:1 (palette below is checked).
- Touch targets ≥ 44×44px, 8px min gap.
- Visible focus ring (2px accent, 2px offset) on every interactive element. Full keyboard nav; dialogs trap focus, `Esc` closes.
- Never color-only meaning: income/expense also use `+` / `−` sign and icon.
- Inputs ≥ 16px font (prevents iOS zoom), labels always visible (no placeholder-as-label), errors under the field + `aria-describedby`.
- Charts have a table/text summary for screen readers.
- `prefers-reduced-motion`: pig stays still except blink; no parallax/confetti.

### 2.3 Color (60 / 30 / 10)

| Token         | Dark (default) | Light     | Use                                    |
| ------------- | -------------- | --------- | -------------------------------------- |
| `--bg`        | `#141414`      | `#F6F3EE` | 60% page background                    |
| `--surface`   | `#2A2A2A`      | `#E8E2D6` | 30% cards, sheets, nav                 |
| `--surface-2` | `#333333`      | `#DED7C9` | hover, inputs, nested cards            |
| `--border`    | `#3A3A3A`      | `#D2CABA` | dividers, 1px borders                  |
| `--fg`        | `#E8E2D6`      | `#141414` | primary text                           |
| `--fg-muted`  | `#A19B90`      | `#5E5952` | secondary text (AA on bg + surface)    |
| `--accent`    | `#E8E2D6`      | `#141414` | 10% primary buttons, active nav, focus |
| `--accent-fg` | `#141414`      | `#E8E2D6` | text on accent                         |
| `--income`    | `#8FB996`      | `#3F7A4A` | income amounts                         |
| `--expense`   | `#E09090`      | `#B04A4A` | expense amounts, over-budget           |
| `--warning`   | `#E3B96A`      | `#9A6B12` | 80% budget                             |
| `--pig`       | `#F4A7B9`      | `#F4A7B9` | mascot only (+ celebration moments)    |
| `--pig-blush` | `#E8879E`      | `#E8879E` | mascot cheeks/snout                    |

Charts: category colors are a muted 8-tone set tuned for both modes (no neon).

### 2.4 Typography

- **UI font:** Plus Jakarta Sans (400 / 500 / 600 / 700), via `next/font`.
- **Brand font:** Fredoka — **only** the "Oink" wordmark and pig speech bubbles.
- Money: `font-variant-numeric: tabular-nums`, `₱` prefix, 2 decimals, thousands separators (`Intl.NumberFormat('en-PH', {currency:'PHP'})`). Large amounts may abbreviate in charts only (₱12.4k).

| Token     | Size / Line height     | Weight  | Use                        |
| --------- | ---------------------- | ------- | -------------------------- |
| `display` | 40 / 44 (mobile 32/36) | 700     | balance, hero numbers      |
| `h1`      | 28 / 34 (mobile 24/30) | 700     | page title                 |
| `h2`      | 20 / 28                | 600     | section title              |
| `h3`      | 17 / 24                | 600     | card title                 |
| `body`    | 16 / 24                | 400     | default text, inputs       |
| `body-sm` | 14 / 20                | 400–500 | list meta, table cells     |
| `caption` | 12 / 16                | 500     | labels, chart axes, badges |

Rules: max 2 weights per component, line length ≤ 70ch, letter-spacing −0.01em on display/h1, sentence case everywhere (no ALL CAPS except tiny badges).

### 2.5 Spacing, layout, shape

- 4px base grid. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Page padding: 16 mobile / 24 tablet / 32 desktop. Card padding 16 / 20. Section gap 24 / 32.
- Radius: 8 (inputs, chips), 12 (buttons), 16 (cards), 24 (sheets top corners), full (avatar, FAB).
- Elevation: borders, not shadows. Only sheets/dialogs get a soft shadow.
- Breakpoints: `sm 640` · `md 768` (tablet: rail nav) · `lg 1024` (sidebar) · `xl 1280` (content max-width 1200).
- Safe areas: `env(safe-area-inset-*)` for PWA notch + home bar.

### 2.6 Motion

- Durations: 120ms (hover/press), 200ms (small UI), 300ms (sheets/pages). Easing: `cubic-bezier(.2,.8,.2,1)`; springs for the pig only.
- Press feedback: scale 0.97. No animations > 400ms on functional UI.

### 2.7 Components (shadcn-based, restyled to tokens)

Button (primary/secondary/ghost/destructive; sm 36 / md 44 / lg 52 height), Input, MoneyInput + numeric keypad, Select, CategoryChip, DatePicker, Sheet (mobile) / Dialog (desktop) via one `ResponsiveModal`, Tabs/SegmentedControl, ProgressBar (budget, color shifts at 80/100%), Ring, StatCard, TransactionRow, EmptyState, Skeleton, Toast, Avatar, ConfirmDialog (destructive only).

---

## 3. Information architecture & screens

### 3.1 Navigation

**Mobile (< 768):** bottom tab bar, 5 slots, labels always shown
`Home · Activity · [ + ] · Plan · Insights`

- `+` = raised center button → Quick-add sheet.
- Top bar: page title (left), avatar → Settings/Accounts (right).
- Pig lives on Home header; tap pig → reaction, long-press → AI chat (if installed).

**Tablet (768–1023):** left icon rail + same 5 destinations.
**Desktop (≥ 1024):** left sidebar (240px): wordmark, Home, Activity, Plan, Insights, Accounts, Settings; "Add transaction" primary button at top; pig docked bottom of sidebar. Keyboard: `N` new transaction, `/` search, `G H/A/P/I` go to page.

### 3.2 Routes

```
(auth)  /login  /register  /recovery-codes  /forgot-password
        /onboarding
(app)   /                    Home
        /activity            list (+ /activity/[id])   /activity/calendar
        /plan                budgets   /plan/bills  /plan/goals  /plan/debts
        /insights            stats (+ /insights/recap/[month])
        /accounts            wallets
        /notifications  /trash  /import
        /settings            profile, appearance, security, sessions, AI, data
        /assistant           AI chat (only if AI enabled)
```

### 3.3 Screens

**Home (mobile)**

```
┌──────────────────────────────┐
│ Good morning, Ren      (avatar)│
│ ┌───────┐  "3-day streak! 🐽" │  pig + speech bubble
│ │  PIG  │                     │
│ └───────┘                     │
│ Safe to spend today           │
│ ₱ 420.00            display   │
│ Spent ₱8,230 of ₱12,000 ▓▓▓░  │
├──────────────────────────────┤
│ Budgets          See all →    │  top 3 by % used
│ Food      ▓▓▓▓▓░  78%         │
│ Transport ▓▓░░░░  35%         │
├──────────────────────────────┤
│ Recent           See all →    │  last 5
│ 🍜 Lunch      −₱150   Today   │
├──────────────────────────────┤
│ Goals  ◯ Laptop 42%  ◯ Trip   │  horizontal scroll
└──────────────────────────────┘
│ Home  Activity  (+)  Plan  Insights │
```

**Home (desktop):** 12-col grid. Left 8 cols: balance + safe-to-spend, spending trend (30 days), recent transactions. Right 4 cols: pig card, budgets, goals.

**Quick-add (sheet / dialog)**

1. Expense / Income / Transfer segmented (default Expense).
2. Big amount + custom keypad (mobile) / autofocus input (desktop).
3. Category chips (recent first, 8 visible, "More").
4. Collapsed row: account · date (Today) · note. Expand to edit.
5. Primary "Save" (Enter). Pig munches coin on save. Undo toast 5s.
   With AI on: text field "e.g. lunch 150 gcash" fills the form for review.

**Activity:** search + filter chips (date range, category, account, type), grouped by day with daily total, infinite scroll, swipe left = delete (with undo), tap = edit. Desktop: table with sortable columns + side detail panel.

**Plan:** tabs `Budgets · Bills · Goals · Debts` (details §12.4).

- Budgets: month switcher, overall budget card, category budgets list (progress, left/over amount), "Copy last month" action, create/edit in modal.
- Goals: cards with piggy-fill visual, target, deadline, "₱X/month needed", add-money action.

**Insights:** period switcher (Week / Month / Year / Custom).

1. KPI row: Spent, Earned, Net, Savings rate, Avg/day, Month-end forecast (each with Δ vs previous period).
2. Spending by category (donut + ranked list).
3. Income vs expense (grouped bars, 6/12 months).
4. Daily spending heatmap calendar.
5. Budget vs actual (horizontal bars).
6. Biggest expenses + top tags. Export CSV.
7. AI monthly summary card (if enabled).

**Settings:** Profile (avatar, display name, pig name) · Appearance (theme, reduced motion, sound, haptics) · Security (change password, regenerate recovery codes, sign out all devices) · AI (§8) · Data (export CSV, delete account).

### 3.4 Auth screens

- Login: username, password (show/hide), "Forgot password?" link. Generic error "Wrong username or password".
- Register: username (3–20, `a-z 0-9 _`, live availability check), password (min 8, strength meter), confirm → then **Recovery codes** screen (must copy/download + tick "I saved them" to continue).
- Pig on auth screens covers its eyes while you type the password. 🙈

---

## 4. Architecture (DDD)

```
src/
  modules/
    identity/   users, sessions, password, recovery codes, avatar
    ledger/     accounts, categories, transactions, recurring
    budgeting/  budgets, periods, alerts
    goals/      goals, contributions
    analytics/  read-only stats queries
    mascot/     mood rules, streaks
    assistant/  AI port + WebLLM/Ollama adapters (client)
    <module>/
      domain/          entities, value objects, repo interfaces, errors
      application/     use cases, DTOs, zod schemas
      infrastructure/  drizzle repos, argon2, r2
      presentation/    server actions, view mappers
  shared/
    kernel/     Money (bigint centavos), Id, Result, DomainError, Clock
    db/         drizzle client + schema index
    container.ts
  stores/       zustand
  components/   ui/ pig/ charts/ layout/
app/            thin routes
proxy.ts        session guard
```

Domain imports nothing from Next/Drizzle. Flow: page → server action → use case → repo.

---

## 5. Data model

- **users**: id, username (unique, lowercase), password_hash, display_name, avatar_key, pig_name (default "Oink"), currency (default `PHP`), created_at
- **sessions**: id (sha256 of token), user_id, expires_at (sliding 30d)
- **recovery_codes**: id, user_id, code_hash, used_at — 8 codes, one-time
- **auth_attempts**: key (username/ip), count, window_start — rate limiting
- **accounts**: id, user_id, name, type (cash/bank/ewallet/card), opening_balance, color, icon, archived
- **categories**: id, user_id, name, kind (expense/income), icon, color, parent_id, archived (seeded defaults)
- **transactions**: id, user_id, account_id, category_id, kind (expense/income/transfer), amount, transfer_account_id, occurred_at, note, tags[], recurring_id, created_at
- **recurring_rules**: id, user_id, template json, frequency, interval, next_run_at, active
- **budgets**: id, user_id, category_id (null = overall), period (weekly/monthly/pay_cycle), amount, rollover, alert_pct (80)
- **goals** / **goal_contributions**
- **user_stats**: user_id, streak_days, last_logged_on, xp
- **user_settings**: user_id, timezone (`Asia/Manila`), payday_schedule json, week_start, hide_amounts, onboarded_at
- **transaction_splits**: id, transaction_id, category_id, amount
- **attachments**: id, user_id, transaction_id, r2_key, mime, size
- **templates**: id, user_id, name, kind, amount, category_id, account_id, sort
- **bills**: id, user_id, name, amount, is_estimate, due_day, frequency, account_id, category_id, remind_days, last_paid_period, active
- **debts**: id, user_id, direction (i_owe/owed_to_me), person, principal, due_date, settled_at · **debt_payments**: id, debt_id, amount, transaction_id
- **notifications**: id, user_id, type, payload json, read_at, created_at
- **push_subscriptions**: id, user_id, endpoint, keys, prefs
- **saved_filters**: id, user_id, name, query json

Common columns: UUIDv7 `id`, `created_at`, `updated_at`, `deleted_at` (soft delete). Transactions also get `idempotency_key` (unique per user) and generated `search_text` with `pg_trgm` GIN index. Key indexes: `transactions(user_id, occurred_at desc, id desc)`, `(user_id, category_id, occurred_at)`, `(user_id, account_id, occurred_at)`.

---

## 6. Forgot password (username-based)

No email exists, so username alone can't prove ownership — anyone could reset anyone. Solution: **username + recovery code**.

1. Register → 8 one-time recovery codes shown once (copy / download .txt).
2. Forgot password → enter **username** + **one recovery code** + new password.
3. Valid → password updated, code burned, all sessions revoked, toast tells how many codes left.
4. Settings → regenerate codes (requires current password).
5. Rate-limited (5 tries / 15 min per username + IP). Same generic error for wrong username or code.

---

## 7. The pig 🐷

Hand-built SVG + Motion, themeable.

- **Interactions:** eyes follow cursor/finger · idle breathe, blink, ear twitch, tail wiggle · tap = bounce + snout wiggle + oink (sound off by default) + haptic · long-press/stroke = blush ("petting") · drag (desktop) = wobble back · covers eyes on password fields.
- **Moods:** happy (under budget / logged today) · worried (80%) · sad + tears (over budget) · celebrating (goal / streak) · sleeping (late night, offline page) · munch (on save / contribution).
- **Speech:** short, max 1 bubble at a time, auto-hide 4s, tap to dismiss. Rule-based; AI-written when AI installed.
- Used for: app icon, splash, empty states, 404, offline page.

---

## 8. Optional local AI

Off by default. Settings → AI → "Install pig brain".

| Provider             | How                                                                                                                                  | Models offered                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **WebLLM** (default) | runs in browser via WebGPU, downloaded once to cache, works offline                                                                  | Qwen2.5-1.5B, Llama-3.2-1B, Phi-3.5-mini, Gemma-2-2B                                                     |
| **Ollama**           | user installs Ollama, app connects to `localhost:11434` (set `OLLAMA_ORIGINS`), app can **pull models with progress** via Ollama API | llama3.2:3b, qwen2.5:3b, gemma3:4b, phi4-mini, mistral:7b + any installed model detected via `/api/tags` |

- Model picker shows size, RAM need, speed hint; switch/uninstall anytime.
- One `AssistantProvider` port → features don't care which.
- Features: natural-language entry, pig chat over a computed stats summary (no raw DB), monthly insights, category suggestion.
- No AI = rule-based parser + canned tips. App fully works.

---

## 9. PWA

- Manifest: name "Oink", pig icons (192/512/maskable), standalone, theme color per mode.
- SW: app shell + static cache, network-first for data, offline page (sleeping pig).
- Offline quick-add queue (IndexedDB), sync on reconnect, pending badge on rows.
- Install prompt (custom, dismissible); iOS instruction sheet.
- Web push budget alerts: later phase.

---

## 10. Zustand stores (persisted)

`useSettingsStore` (theme, sound, haptics, motion) · `useMascotStore` (mood, bubble queue) · `useUiStore` (quick-add, filters, period) · `useAssistantStore` (provider, model, download progress, chat) · `useOfflineQueue` (IndexedDB).
Server is source of truth for money data.

---

## 11. Security

Argon2id · session token 32 random bytes, hash stored · cookie httpOnly/Secure/SameSite=Lax · rate limits on login + forgot · every query scoped by `user_id` · R2 presigned PUT, image only, ≤ 2 MB, client-side resize to 256px · env: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.

---

## 12. Feature set (v3)

Priority: **P0** = MVP, **P1** = right after, **P2** = nice to have.

### 12.1 Getting started

- **P0 Onboarding (≤ 60s, skippable):** pig intro → pick wallets (Cash, GCash, Maya, bank, card) with starting balances → monthly income + **payday schedule** (15th & 30th / monthly / weekly) → budget template (50/30/20, "copy my spending later", or blank).
- **P0 Default PH categories:** Food, Transport (jeep/grab/fuel), Bills (Meralco, water, internet, load), Rent, Groceries, Shopping, Health, Education, Family/Padala, Entertainment, Subscriptions, Personal care, Gifts, Fees · Income: Salary, Freelance, Business, 13th month, Allowance, Refund, Other.
- **P0 Sample data toggle** for trying the app, wiped in one tap.

### 12.2 Logging money (speed is the feature)

- **P0 Quick-add** from anywhere (FAB, `N`, PWA app shortcut).
- **P0 Amount math:** `150+75` → ₱225.
- **P0 Smart defaults:** last-used wallet, category guessed from note history, date = today, recent amounts as chips.
- **P0 Templates / favorites:** "Jeep ₱13", "Coffee ₱150" one-tap. "Repeat" on any row.
- **P0 Transfers** between wallets (+ optional fee, e.g. bank → GCash ₱15).
- **P1 Split transaction** across categories (groceries + household).
- **P1 Receipt photo** (R2, compressed client-side), viewable on the row.
- **P1 Offline add** with sync + pending badge.

### 12.3 Activity (list, search, bulk)

- **P0 Server-side search** (note, tags, category, wallet, amount like `>500`) with fuzzy match.
- **P0 Filters:** date range presets, type, categories, wallets, tags, amount range. Stored in the **URL** (shareable, back button works).
- **P0 Keyset pagination** + infinite scroll (mobile), "Load more"/page size (desktop table). Day groups with daily total.
- **P0 Edit / delete with undo** (soft delete → Trash, auto-purge after 30 days, restore).
- **P1 Bulk actions:** multi-select → recategorize, move wallet, tag, delete.
- **P1 Saved filters** ("Food this month", "Grab rides").
- **P1 Calendar view:** month grid, daily totals, tap a day.

### 12.4 Planning

- **P0 Budgets** per category + overall, **monthly or per pay cycle** (15th–29th, 30th–14th). Progress, remaining, **safe-to-spend per day** until next payday.
- **P0 Rollover** (unused carries over, overspend deducts) optional per budget.
- **P0 Copy last period / auto-suggest from 3-month average.**
- **P0 Bills & subscriptions:** name, amount (fixed or estimate), due day, wallet, reminder (1/3 days before). "Mark paid" → creates the transaction. Upcoming bills on Home. Overdue state.
- **P0 Recurring income/expense** (salary kinsenas, rent) auto-posted or "confirm to post".
- **P0 Savings goals:** target, deadline, monthly needed, contributions from a wallet, pig fills up. Pause/complete/archive.
- **P1 Debts & IOUs ("utang"):** I owe / owed to me, person, due date, partial payments, settle → transaction. Total owed on Home.
- **P1 Emergency fund goal** preset (3–6× monthly expenses, computed).
- **P2 No-spend days challenge.**

### 12.5 Insights

- **P0** KPIs with Δ vs previous period, category donut, income vs expense, trend, budget vs actual, biggest expenses (§3.3).
- **P0 Cash flow forecast:** balance projection to next payday using bills + recurring + avg daily spend. Warns "you'll be short ₱X by the 28th".
- **P1 Net worth over time** (wallets − debts).
- **P1 Monthly recap** ("Oink Wrapped"): top category, biggest day, no-spend days, savings rate, pig verdict. Shareable image.
- **P1 Spending by day of week / time of day**, merchant/tag leaderboard.
- **P0 Export** CSV (filtered view) · **P1** PDF monthly report.

### 12.6 Notifications

- **P0 In-app notification center** (bell): budget 80/100%, bill due/overdue, goal milestone, recurring posted, sync failed.
- **P1 Web push** (opt-in, per-type toggles, quiet hours) + **daily log reminder** at chosen time.
- **P1 Weekly summary** every Monday.

### 12.7 Data & privacy

- **P0 Hide amounts** toggle (eye icon, blurs all ₱) for public places.
- **P1 App lock:** 4–6 digit PIN / device biometrics (WebAuthn) when opening the PWA.
- **P1 CSV import** (bank / GCash / spreadsheet) with column mapping, preview, duplicate detection.
- **P0 Full export (JSON + CSV)** and **delete account** (PH Data Privacy Act friendly).
- **P0 Sessions list:** see devices, sign out one / all.

### 12.8 Usability extras

- **P0 Command palette** `Ctrl/⌘+K`: search transactions, jump to page, run actions.
- **P0 Pull to refresh** (mobile), swipe actions on rows, haptics.
- **P0 Undo toast** for every destructive action. Confirm dialog only for irreversible ones (delete account, purge trash).
- **P1 Week starts on** Sun/Mon, date format, first day of budget month setting.
- **P1 Help tips** from the pig on first use of each screen (dismissible, once).

### 12.9 Navigation update

- **Plan** tabs: `Budgets · Bills · Goals · Debts`.
- **Activity** toggle: `List · Calendar`.
- **Home** order: safe-to-spend → upcoming bills (next 7 days) → budgets → recent → goals → owed.
- New routes: `/plan/bills`, `/plan/goals`, `/plan/debts`, `/activity/calendar`, `/trash`, `/notifications`, `/import`, `/onboarding`.

---

## 13. Engineering standards

### 13.1 Code

- TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. No `any`, no non-null `!` without reason.
- ESLint: `next`, `typescript-eslint` strict-type-checked, `jsx-a11y`, `eslint-plugin-boundaries` (enforces DDD layers: domain ↛ infrastructure/app), import sorting. Prettier + `prettier-plugin-tailwindcss`.
- Naming: files `kebab-case`, components `PascalCase`, hooks `use-*.ts`, use cases `create-transaction.use-case.ts`, repos `transaction.repository.ts` (port) / `drizzle-transaction.repository.ts` (adapter).
- SOLID, small functions, no barrels across module boundaries (only `module/index.ts` public API).
- Minimal comments — code explains itself; comment only the "why".
- `server-only` on all infrastructure + use case files. Env parsed once with Zod (`src/shared/env.ts`), app fails fast if missing.

### 13.2 Errors & validation

- Zod at every boundary (form, server action, route handler, env, AI output).
- Expected failures → `Result<T, DomainError>`; bugs → throw. Server actions return `ActionResult<T> = { ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`.
- Domain errors mapped to friendly messages in one place.
- `error.tsx`, `not-found.tsx`, `global-error.tsx` per route group, with pig.

### 13.3 Server actions & API

- Pipeline every action: **auth → validate → rate limit → use case → cache invalidate (tag) → typed result**.
- Route handlers only for: avatar/receipt presign, CSV/JSON export (streamed), push subscription, offline sync.
- Caching per Next 16 docs (`cacheTag` + tag invalidation after writes); user data tagged by `user:{id}:transactions` etc.
- Idempotency key on create (offline sync + double-tap safe).

### 13.4 Pagination & search

- **Keyset (cursor) pagination** on `(occurred_at DESC, id DESC)`; cursor = base64 of both. Page size 20 (mobile) / 25–100 (desktop). Never `OFFSET` on large tables.
- Response: `{ items, nextCursor, hasMore }`. Totals (count, sum) via a separate lightweight aggregate query.
- **Search:** Postgres `pg_trgm` GIN index on `note` + `search_text` (generated: note + tags + category + wallet names) for fuzzy; amount operators parsed server-side. Debounced 300 ms, min 2 chars, cancel in-flight.
- Sort fields whitelisted. All filters validated by one Zod `TransactionQuery` schema shared by page, action, and export.
- Server Components read `searchParams` → query → stream with `<Suspense>` + skeleton.

### 13.5 Database

- Migrations: `drizzle-kit generate` + `migrate` (committed SQL), never `push` outside local.
- Multi-row writes inside DB transactions (transfer, split, mark bill paid, settle debt).
- All tables: `id` (UUIDv7, sortable), `created_at`, `updated_at`; user-owned tables `user_id` + `deleted_at` (soft delete).
- Timestamps stored UTC; period math in user timezone (default `Asia/Manila`).
- Money `bigint` centavos; balances computed (or cached + reconciled), never floats.
- Indexes per query pattern; `EXPLAIN` checked for Activity + Insights queries.

### 13.6 Security

- Argon2id, rate limits, session rotation on login/password change.
- Security headers: CSP (nonce), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors none.
- Server actions' built-in origin check (CSRF); `SameSite=Lax` cookie.
- Authorization in repos: every query `WHERE user_id = $session.userId`. Tested.
- Upload: type sniffing, size limits, random keys, private bucket + signed GET.
- No PII/amounts in logs.

### 13.7 Frontend

- Server Components by default; `"use client"` only at leaves (forms, charts, pig, sheets).
- Forms: React Hook Form + Zod resolver, `useActionState` for pending/errors, optimistic updates with `useOptimistic` on add/delete.
- Heavy stuff lazy: charts, AI, confetti via `next/dynamic`.
- `next/image` for avatars/receipts, `next/font` self-hosted.
- Perf budget: LCP < 2.5 s on mid phone, JS per route < 200 KB gz, CLS < 0.1.

### 13.8 Testing & quality

- **Vitest:** domain + use cases with in-memory repos (target 80%+ on domain).
- **Integration:** repos against a Neon branch DB.
- **Playwright:** register → onboarding → add expense → budget hits 80% → search → export; mobile + desktop viewports; axe accessibility checks.
- **Husky + lint-staged** (lint, format, typecheck on staged), **commitlint** (Conventional Commits).
- **GitHub Actions:** lint · typecheck · test · build on every PR; migrations check.

### 13.9 Git

- Branches: `feat/*`, `fix/*` off `development`; PR `development → master` for releases.
- Conventional Commits (`feat(ledger): add transfer fee`).

### 13.10 Observability

- Structured logger (pino) with request id; errors captured (Sentry optional, P2).
- Health route `/api/health` (DB ping) for Docker.

---

## 14. Phases

| #   | Phase               | Output                                                                                                                                         |
| --- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Foundation          | deps, lint/format/hooks/CI, env schema, compose `env_file`, Drizzle + Neon + migrations, tokens, fonts, shadcn restyle, app shell, error pages |
| 1   | Pig v1              | SVG pig, idle, eye-follow, tap, moods                                                                                                          |
| 2   | Identity            | register, login, logout, recovery codes, forgot password, sessions list, `proxy.ts`, profile, avatar → R2                                      |
| 3   | Onboarding + Ledger | onboarding, wallets, categories, transactions, transfers, templates, quick-add, Activity (keyset + search + filters + undo/trash)              |
| 4   | Plan                | budgets (monthly + pay cycle), bills, recurring, goals, notification center, pig moods                                                         |
| 5   | Insights            | Home, Insights, cash-flow forecast, export CSV/JSON, command palette, hide amounts                                                             |
| 6   | PWA                 | manifest, icons, shortcuts, SW, offline queue + sync, install prompt                                                                           |
| 7   | P1 pack             | debts, split, receipts, bulk actions, saved filters, calendar, CSV import, recap, push, app lock                                               |
| 8   | Local AI            | WebLLM + Ollama, model picker/pull, NL entry, chat, insights                                                                                   |
| 9   | Hardening           | a11y audit, perf budget, e2e suite, security headers review                                                                                    |

Each phase: tests pass, lint clean, committed on `development`.
