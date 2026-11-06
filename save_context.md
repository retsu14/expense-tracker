# save_context.md

Paste this into a new Claude session to restore context. Update **Progress** and **Log** after each session. Full plan: `PLAN.md` (v3).

---

## Project

Oink — expense + budget tracker PWA (mobile + desktop), interactive pink pig mascot "Oink", optional local AI.

## Locked decisions

- Next.js 16 fullstack. `proxy.ts` not middleware, async `params`/`cookies()`. Read `node_modules/next/dist/docs/` before coding.
- DDD: `src/modules/<context>/{domain,application,infrastructure,presentation}`, `src/shared/kernel`, `src/shared/container.ts`. Contexts: identity, ledger, budgeting, goals, analytics, mascot, assistant.
- Neon Postgres + Drizzle (already provisioned). Money = bigint centavos. Currency PHP (₱), one per user.
- Zustand + `persist`. Tailwind v4, shadcn/ui, Motion, Recharts, vaul, sonner, lucide, next-themes.
- Auth: username + password only, Argon2id, DB sessions. Forgot password = username + one-time recovery code (8 codes at register).
- R2 for avatars (already provisioned), presigned PUT.
- PWA: `app/manifest.ts` + custom SW + offline quick-add queue.
- AI optional: WebLLM default (Qwen2.5-1.5B, Llama-3.2-1B, Phi-3.5-mini, Gemma-2-2B) + Ollama (llama3.2:3b, qwen2.5:3b, gemma3:4b, phi4-mini, mistral:7b, pull from app, detect installed).
- Dev runs in Docker.

## UI/UX

- Colors 60/30/10: dark bg `#141414`, surface `#2A2A2A`, accent `#E8E2D6`. Light bg `#F6F3EE`, surface `#E8E2D6`, accent `#141414`. Muted text dark `#A19B90` / light `#5E5952`. Pig `#F4A7B9` mascot only. Full tokens in PLAN §2.3.
- Fonts: Plus Jakarta Sans (UI), Fredoka (wordmark + pig speech only). Type scale PLAN §2.4. Tabular nums for money.
- 4px grid, radius 8/12/16/24, borders not shadows, WCAG 2.2 AA, 44px targets, inputs ≥16px.
- Nav: mobile bottom tabs `Home · Activity · (+) · Plan · Insights`; tablet rail; desktop 240px sidebar. Settings/Accounts via avatar.
- Quick-add ≤ 3 taps. Every state designed (loading/empty/error/offline/success).

## Pig

SVG + Motion. Eye-follow, blink, breathe, tap bounce/oink, petting blush, drag wobble, covers eyes on password. Moods: happy/worried/sad/celebrating/sleeping/munch.

## Features (PLAN §12, P0/P1/P2)

Onboarding w/ payday schedule (15th/30th), PH default categories, quick-add w/ amount math + templates, transfers w/ fee, split, receipts (R2), keyset-paginated Activity w/ server-side fuzzy search + URL filters, soft delete + trash + undo, bulk actions, saved filters, calendar, budgets monthly or per pay cycle + rollover, bills & subscriptions, recurring, goals, debts/utang, cash-flow forecast, net worth, monthly recap, notification center + web push, hide amounts, app lock, CSV import/export, command palette ⌘K.

## Engineering (PLAN §13)

TS strict+, ESLint boundaries (DDD layers), Prettier, Husky/lint-staged/commitlint, GitHub Actions. Zod everywhere, `Result` + `ActionResult`. Action pipeline: auth → validate → rate limit → use case → tag invalidate. Keyset pagination `(occurred_at, id)`, pg_trgm search. UUIDv7, soft delete, UTC + Asia/Manila, idempotency keys. RHF + useActionState + useOptimistic. Vitest / Playwright + axe. Conventional Commits, `feat/*` off `development`.

## User preferences

- Minimal code comments, concise replies — save tokens.
- Plan before building. Branch `development`.

## Codebase notes (Phase 0)

- App lives in `src/app`; route group `(app)` = shell pages. Alias `@/*` → `src/*`.
- Error boundaries use `retry` prop (Next 16). `LayoutProps`/`PageProps` are global types from `next typegen` (run by `npm run typecheck`).
- Tokens in `src/app/globals.css` (`bg/surface/surface-2/border/fg/fg-muted/accent/income/expense/warning/pig`), type utilities `text-display|h1|h2|h3|body|body-sm|caption`. `cn` in `src/lib/utils.ts` is extended so tailwind-merge knows these font sizes — add any new `text-*` size there.
- Theme: next-themes class `dark`/`light`, default dark.
- DB: `db()` lazy (Neon Pool + Drizzle, `casing: snake_case`), `Tx` type, column helpers `id()/timestamps/softDelete` in `src/shared/db/columns.ts`. Module schemas go in `src/modules/*/infrastructure/*.schema.ts` and must be re-exported from `src/shared/db/schema.ts`.
- `env()` lazy Zod-validated in `src/shared/env.ts`. Secrets live in `.env.local` (Next, drizzle.config and docker compose all load it; `.env` also supported).
- Kernel: `Money` (bigint centavos), `Result/ok/err/DomainError/ActionResult`, `newId` (UUIDv7), `Clock`.
- ESLint `boundaries/dependencies` enforces domain/application purity (verified).
- UI: `Button`, `Input`, `Label`, `Card`, `Skeleton`, `EmptyState`, `ResponsiveModal` (vaul <768, dialog ≥768), `ThemeSwitcher`, `Toaster`. Shell: `Sidebar` (lg), `NavRail` (md), `BottomNav` + `MobileTopBar` (<md), `QuickAddModal` (placeholder) via `useUiStore`.
- Scripts: `typecheck`, `lint`, `format`, `test`, `check`, `db:generate|migrate|studio`.
- Docker: after changing deps, `docker compose down && docker volume rm expense-tracker_frontend-node-modules && docker compose up -d --build`.

## Pig notes (Phase 1)

- `src/components/pig/pig.tsx` = `<Pig mood size coverEyes interactive listen name />`. Mood falls back to `useMascotStore` mood; `listen` shows `useMascotStore.say()` messages in its bubble.
- Parts in `pig-parts.tsx` (Eyes, Brows, Mouth, Tears, Zzz, Sparkles, Coin, CoverHooves). viewBox 200x200, eyes at x 74/126 y 98.
- Interactions: eye-follow (`use-eye-follow`), random blink (`use-blink`), ear twitch + tap bounce/snout wiggle via `useAnimate` selectors (`[data-ear]`, `[data-snout]`), long-press 450ms / mouse stroke = petting blush, drag only on fine pointer, Enter/Space = tap. Sound = WebAudio synth `oink-sound.ts` (off by default), haptics via `navigator.vibrate`; both toggled in Settings → Oink.
- Mood rules: `src/modules/mascot/domain/mood.ts` `deriveMood()` (tested). Priority: celebrating > munch > sad (>100%) > worried (>= alert) > sleeping (23–5h or idle 30m) > happy.
- `HomePig` on Home sets mood + time-based greeting. Dev playground at `/dev/pig` (404 in production).
- Reduced motion: only blink + static extras.

## Identity notes (Phase 2)

- Module `src/modules/identity`: domain (user/password/recovery-code/session rules + ports), application (`auth.use-cases.ts`, `account.use-cases.ts`, zod `schemas.ts`, `in-memory.ts` fakes for tests), infrastructure (`identity.schema.ts`, drizzle repos + DB rate limiter, argon2id + sha256 tokens), presentation (`actions.ts` server actions, `dal.ts` `getCurrentUser`/`requireUser`, `session-cookie.ts`).
- Composition root `src/shared/container.ts` → `identityDeps()`. Shared helpers: `src/shared/validation.ts` `parse()`, `src/shared/action.ts` `runAction/formToObject`, `src/shared/storage/r2-storage.ts`.
- Tables: users (unique lower(username)), sessions (id = sha256(token)), recovery_codes, auth_attempts. Migration `drizzle/0000_identity.sql` applied to Neon.
- Cookie `oink_session` (httpOnly, lax, 30d). `src/proxy.ts` = optimistic cookie check + sliding cookie refresh; real check in `requireUser()` (redirects to `/api/auth/expired` which clears cookie → `/login?expired=1`). DB session slides when <15d left, lastSeen touched hourly.
- Rate limits: login 10/15m per username + 50/15m per IP, reset 5/15m per username + 20 per IP, register 10/h per IP.
- Forms: `useFormAction(action)` → `formProps` (= `action` + `onSubmit`, so pre-hydration submits still POST to the server action, never GET), `fieldError()`, `formError`. `Field` wires label/aria. `PasswordInput` drives pig cover-eyes via `useUiStore`.
- Avatar: client resizes to 256px webp → `createAvatarUploadAction` presigned PUT → browser PUT to R2 → `confirmAvatarAction` (HEAD checks size/type/prefix) → old avatar deleted. **R2 bucket needs a CORS policy allowing PUT from app origins.**
- Browser-pane testing quirk: requestAnimationFrame stalls in the hidden pane, so Suspense reveals/toasts/animations only show after a screenshot.

## Ledger notes (Phase 3)

- Module `src/modules/ledger`: domain (`account`, `category` + `DEFAULT_CATEGORIES` (PH, `system: "fees"` row), `transaction` (`validateDraft`, `extractTags`), `amount-expression` (`evaluateAmount` safe math → centavos), `transaction-query` (filter, `parseSearch` for text/#tags/>500, period presets, keyset cursor, `parseFilterParams`/`filterToParams` for URL), `settings` (payday schedule), `template`, `ports`), application (`ledger.use-cases.ts`, `schemas.ts`), infrastructure (`ledger.schema.ts`, `drizzle-ledger.repository.ts`), presentation (`actions.ts`). Container: `ledgerDeps()`. Kernel `time.ts` (tz-aware Ymd helpers).
- Tables: user_settings (timezone, payday jsonb, monthly_income, onboarded_at), accounts (opening_balance; balance computed in SQL), categories, transactions (bigint centavos, linked_id for transfer fee rows, tags text[], idempotency_key unique per user, soft delete, trigram GIN on note), templates. Migration `0001_ledger.sql` (adds pg_trgm) applied.
- Transfers: one `transfer` row + optional linked `expense` fee row (Fees category). Edit/delete/restore keep the fee row in sync. Fee rows aren't editable directly.
- Search: ILIKE on note/category/wallet + `word_similarity(q, note) > 0.5` for typos. Amount tokens and #tags parsed server-side. Filters live in the URL.
- Keyset pagination on (occurred_at, id) desc, 30/page, `loadTransactionsAction`; day totals via separate aggregate (grouped by ordinal `sql\`1\`` because tz is a param). Summary = separate aggregate.
- (app) layout redirects to `/onboarding` until `onboarded_at` set. Onboarding: wallets + balances, payday (twice/monthly/weekly/varies), optional income; skip = Cash wallet.
- Quick-add (`components/ledger/quick-add-form.tsx`, opened via `useUiStore.setQuickAddOpen` / `openEditTransaction(id)`, key `N`): amount math + operator buttons, favorites (tap = log instantly), category grid (usage-sorted, note-based suggestion), wallet chips w/ balances, Today/Yesterday/date, note with #tags, save-as-favorite, idempotency key, undo toast, pig munch.
- Activity: search (`/` focuses), filter sheet, chips, day groups + totals, swipe-left/hover delete with undo, Trash page (`/trash`, 30-day auto purge on visit, restore, empty). Accounts page CRUD + archive. `/settings/categories` categories CRUD/archive + favorites removal.
- Gotchas fixed: in raw `sql` inside a single-table select Drizzle renders outer columns unqualified → use `sql.raw('"accounts"."id"')`. Proxy refreshes the cookie on GET only (setting it on action POSTs made Next refresh the page). Page-level grids need `grid-cols-1` or wide content overflows on mobile. Lists reset from server props by JSON signature, not identity.

## Planning notes (Phase 4)

- Module `src/modules/planning` (budgets + bills/recurring + goals + notifications in one module; debts deferred to P1 pack). Domain: `period.ts` (month / pay-cycle ranges from payday schedule, clamps short months, `nextPayday`), `budget.ts` (progress, rollover carry one period back, alert level, suggestion rounding to ₱100, safe-to-spend/day), `recurring.ts` (schedules monthly/semi-monthly/weekly/yearly, occurrences, status, `postKey` = idempotency key), `goal.ts` (progress, calendar-month `monthlyNeeded`).
- Tables (migration 0002): budgets (UNIQUE NULLS NOT DISTINCT user+category; null category = overall), recurring, recurring_posts (pk recurring+due), goals, goal_contributions (signed amounts; goals are set-aside tracking, wallets unchanged), notifications (unique user+dedupe_key).
- Use cases `planning.use-cases.ts`: `budgetOverview` (items, overall, safe-to-spend minus unpaid bills in period, usedPct for pig), budget CRUD + `budgetSuggestions` (3-month avg), `billOccurrences`, recurring CRUD, `markOccurrence` (paid → ledger `createTransaction` with postKey idempotency), `autoPostDue`, `checkBills`, `checkBudgetAlerts` (returns newly created alerts), `syncPlanning`, goals CRUD + `contributeToGoal` (auto-complete + notification).
- `maybeSyncPlanning` runs in (app) layout, throttled 2 min per user in memory. `createTransactionAction` returns `alerts`; quick-add shows warning toasts + pig worried/sad.
- UI: `/plan` (budgets + safe-to-spend + suggestions), `/plan/bills`, `/plan/goals` (GoalPig fills up), `/notifications` (auto mark read + button), bell in sidebar/rail/top bar. Home: safe-to-spend, upcoming bills, top budgets, goals, pig mood from budgets (any category over → at least worried).
- Testing quirk: when the browser pane is hidden, `window.$RV(window.$RB)` flushes React streaming reveals.

## Insights notes (Phase 5)

- Module `src/modules/analytics` (read side): domain `insights.ts` (presets month/last-month/3m/year with previous range, `kpis` incl. savings rate + pace forecast + % deltas, `forecastCashflow` 30-day projection, `heatLevel`), repo `drizzle-analytics.repository.ts` (totals, byCategory, monthly, daily, weekday, biggest, topTags, exportRows), use cases `insights`, `cashflowForecast` (avg daily spend excludes paid recurring), `exportTransactions`. Container `analyticsDeps()`.
- `/insights?p=…`: KPI tiles, "Where it went" ranked single-hue bars (no donut: 16 categories can't be told apart by color), daily calendar heat map, income vs spending 12-month bars, cash-flow forecast area, weekday bars, budget vs actual, biggest expenses, top tags. Every chart card has a Chart/Table toggle (needed because light-mode series colors are under 3:1).
- Chart colors are validated (dataviz validator): `--series-income`/`--series-expense` (aqua/orange, stepped per theme), `--series-1` blue, `--heat-1..5` blue ramp (dark ramp reversed so low values recede). Category pastel colors fail the validator — use them only for icons, never as chart series.
- Exports: `/api/export/transactions?from&to` (CSV, BOM, formula-injection safe, amounts numeric), `/api/export/backup` (JSON, centavos, no ids/hashes). Settings → Your data: exports + delete account (password + type username; cascades; R2 avatar removed) → `/register?deleted=1`.
- Hide amounts: eye toggle (sidebar/top bar), `html.amounts-hidden` blurs `.tabular` (opt out with `.no-blur`) and `<Amount>` shows ₱•••. Command palette Ctrl/⌘K (`command-palette.tsx`): actions, pages, live transaction search; search button in sidebar/top bar.

## PWA notes (Phase 6)

- Icons generated from the pig SVG by `npm run icons` (`scripts/generate-icons.mjs`, sharp): `public/icons/icon-192|512.png`, `maskable-512.png`, `badge-96.png`, `src/app/apple-icon.png`, `src/app/icon.svg`.
- `src/app/manifest.ts` (standalone, #141414, shortcuts: `/?add=1` opens quick-add, Activity, Budgets).
- `public/sw.js`: precaches `/offline` + icons; cache-first for `/_next/static` + `/icons`; navigations network-first → `/offline` fallback; never caches HTML/data. Registered only in production (`ServiceWorkerRegister` in Providers). Bump `VERSION` to invalidate caches. `next.config.ts` sends sw.js no-cache + CSP headers and global security headers.
- Offline queue: `src/lib/offline-queue.ts` (IndexedDB `oink-offline`, items keyed by idempotencyKey, scoped by userId; `processQueue` tested). Quick-add caches its context in localStorage `oink-qa-ctx:<userId>` (cleared on auth pages); when a save fails offline it enqueues and toasts. `OfflineSync` (in AppShell) syncs on load, on `online`, every 30s; banner shows offline/pending; `PendingEntries` on Activity lists items, errors, discard.
- Install: `usePwaStore` captures `beforeinstallprompt`; `InstallPrompt` banner after 2nd visit (14-day snooze), iOS shows Share → Add to Home Screen sheet; Settings → Appearance has `InstallAppRow`.
- Testing: SW registration can't run in the embedded Claude browser ("unknown error"); verify SW in real Chrome/Safari. Offline queue verified by stopping a local `next start -p 3100` server.

## Progress

- [x] Plan v3 (`PLAN.md`)
- [x] 0 Foundation
- [x] 1 Pig v1
- [x] 2 Identity
- [x] 3 Onboarding + Ledger
- [x] 4 Plan (budgets, bills, recurring, goals, notifications)
- [x] 5 Insights
- [x] 6 PWA
- [ ] 7 P1 pack
- [ ] 8 Local AI
- [ ] 9 Hardening

## Log

- 2026-11-06 — Plan v1 + context file created. Fresh Next 16.3 scaffold.
- 2026-11-06 — Plan v2: answers locked, UI/UX spec (tokens, type scale, IA, wireframes), recovery-code forgot password, Ollama model picker.
- 2026-11-06 — Plan v3: prioritized feature set, engineering standards (pagination, search, lint, tests, CI), 10 phases.
- 2026-11-06 — Phase 0 done: deps, strict TS, ESLint (strict-type-checked + DDD boundaries), Prettier, Husky/lint-staged/commitlint, CI, Vitest, env schema, Drizzle/Neon client, kernel, tokens/fonts, UI primitives, responsive shell, error/404/loading pages, Docker env_file + healthcheck. Build + checks pass. Committed 0414004.
- 2026-11-06 — Phase 1 done: interactive SVG pig (6 moods + cover eyes), eye-follow, blink, tap/pet/drag, speech bubble, oink sound + haptics toggles, mood domain rules + tests, Home pig, /dev/pig playground. Vitest uses native tsconfigPaths. Committed 32a79e6.
- 2026-11-06 — Phase 2 done: username/password auth (argon2id, DB sessions, proxy guard), 8 recovery codes + forgot password, rate limits, settings (profile, pig name, change password, regenerate codes, devices, sign out), avatar upload to R2, user in sidebar/top bar, Home greets by name. 26 tests total. E2E verified on Neon: register, login (wrong + right), sign out, reset with code (reuse rejected), profile save. Avatar browser upload blocked by missing R2 CORS (server-side presigned PUT verified OK); R2_PUBLIC_URL (r2.dev) times out from this network — leave it empty to fall back to signed GET URLs, or attach a custom domain. Test account `piggy_tester` exists in the DB.
- 2026-11-06 — Phase 3 done: onboarding, wallets, PH categories, transactions (expense/income/transfer + fee), amount math, favorites, quick-add create/edit, Activity with server search/filters/keyset paging/undo, Trash, Accounts, Categories pages, Home totals + recent, N shortcut. 43 tests. E2E verified on Neon (balances, search, filters, paging, undo/trash, transfer fee edit, mobile layout). Test login in git-ignored `test-account.local.md`.
- 2026-11-06 — Phase 3 committed c030bb7. Phase 4 done: budgets (monthly/pay cycle, rollover, alerts, suggestions, safe-to-spend), bills & recurring (mark paid/skip, auto-post, reminders), goals (contributions, auto-complete), notification center + bell, budget alert toasts, Home planning widgets, pig mood from budgets. 51 tests. E2E verified on Neon.
- 2026-11-06 — Phase 4 committed 84ef6ff. Phase 5 done: Insights page with validated charts + table views, cash-flow forecast, CSV/JSON export, delete account, hide amounts, Ctrl/⌘K command palette. 59 tests. E2E verified on Neon (numbers, exports, palette, hide, delete cascade).
- 2026-11-06 — Phase 5 committed 24302b9. Phase 6 done: manifest + pig icons + shortcuts, service worker + offline page, offline quick-add queue with auto-sync, install prompt (Android/desktop + iOS help), security headers. 61 tests. Offline queue verified end-to-end (saved offline, synced once on reconnect).
