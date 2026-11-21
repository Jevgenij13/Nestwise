# Nestwise PRD (MVP)

Status: v1.0, 2026-11-21. Owner: Product. Readers: design, development, QA.
AC IDs are a contract: never renumber; retire by marking "(removed)". Priorities: **P0** = ships in MVP; **P1** = MVP stretch, first to cut, ships in v1.1 if cut; **P2** = post-MVP.

## 1. Vision
One calm, free app on the iPhone home screen that answers three questions: "What am I paying and when?", "Who does what at home?", and "How long until I reach my goal?". No account, no cost, works offline, your data stays on your phone.

## 2. Target user
Primary: one person on an iPhone, one hand, 30 seconds at a time (standing in a shop, at the door, on the sofa). Secondary: their partner, family or flatmates, who share chore and shopping lists. Not tech-savvy; will not create accounts or read docs.

## 3. Scope and non-goals
In scope (MVP): bills/subscriptions tracker, household chore and shopping lists, savings goal calculator, plus onboarding, settings, backup and offline.

Non-goals (MVP): bank connections or auto-import of transactions; multi-currency per item or FX conversion; real-time sync or accounts; true push notifications; native app / App Store; Android/desktop optimisation (should work, not tested); receipts/attachments; expense categorisation and charts beyond one monthly total; payment history; investment advice; localisation beyond English UI.

## 4. Platform constraints and decisions
| # | Decision | Reason |
|---|---|---|
| D1 | Installable PWA on iOS 16.4+ via Safari > Share > Add to Home Screen, hosted on free static HTTPS hosting (GitHub Pages/Cloudflare Pages/Netlify free) | No Apple Developer account, no server cost |
| D2 | Local-first: all data in `localStorage` on the device as one versioned JSON envelope (the same format as a backup), requested persistent with `navigator.storage.persist()`; no backend, no analytics. IndexedDB is a later option if data outgrows localStorage (about 5 MB) | $0 to run, privacy, offline by default; localStorage is synchronous, which keeps every interaction under 100 ms and the code simple |
| D3 | Safari tab and the installed home-screen app have **separate storage**. Onboarding tells users to install first; export/import (AC-APP-8/9) moves data between them | Known iOS behaviour; otherwise users "lose" data after installing |
| D4 | No background execution on iOS PWAs, so reminders are computed when the app opens/resumes, never on a timer | Platform limit |
| D5 | Reminders = "Due soon" surfacing on open + app icon badge where supported + `.ics` calendar export for renewals; Web Push is post-MVP P2 | Calendar alerts are the only reliable out-of-app reminder without a server |
| D6 | "Shared" lists in MVP = one household on one shared device with member profiles ("who is using?"), plus snapshot share/import of a list between phones (file or code in P0, link/QR in P1) | Gives sharing without a server; honest that it is not live |
| D7 | True real-time sync is P2 and needs a free-tier backend (Supabase or Firebase Spark) plus auth. Costs $0 within quotas but adds an account, a hosted dependency, quota/inactivity-pause risk (verify current limits), and breaks "no account" | Flagged per constraint; not in MVP |
| D8 | One default currency set in settings; all money stored as integer minor units (e.g. 1250 = 12.50); no conversion | Avoids float errors and FX scope |
| D9 | Dates are local calendar dates stored as `YYYY-MM-DD` (no time zone, no time of day) | Bills and chores are day-level; avoids DST/timezone bugs |
| D10 | Member profiles are labels, not security; no PIN or auth | Keeps one-hand speed; data is on the user's own device |
| D11 | Sync conflicts (snapshot import) resolved per item by newest `updatedAt`; deletions use `deletedAt` tombstones kept 30 days | Prevents deleted items reappearing on import |
| D12 | Web Push (iOS 16.4+, installed PWA only) needs a sender server (e.g. a free Cloudflare Worker cron + VAPID keys); post-MVP P2, $0 at small scale but is a backend | Flagged per constraint |

Navigation: bottom tab bar with 4 tabs (**Today, Bills, Home, Goals**) plus a gear for Settings in the header. Today = "Due soon" bills and tasks plus the monthly total.

## 5. BILL: Bills and subscriptions

**Cadences and normalisation.** Supported: weekly, every 2 weeks, monthly, quarterly, yearly. Monthly equivalent = amount x factor: weekly x 52/12 (4.3333), every 2 weeks x 26/12 (2.1667), monthly x 1, quarterly x 1/3, yearly x 1/12. Sums are computed on unrounded values and rounded once (half up to the minor unit); per-row displays are rounded individually, so rows may differ from the total by up to a few minor units. Examples: weekly 10.00 = 43.33/mo; every 2 weeks 25.00 = 54.17/mo; quarterly 30.00 = 10.00/mo; yearly 120.00 = 10.00/mo.

**Next due date.** Each bill stores an anchor date (first/any known due date). Next due = the first occurrence on or after today. Weekly and every 2 weeks step by 7/14 days. Monthly/quarterly/yearly step by 1/3/12 months keeping the anchor's day-of-month, clamped to the month end (anchor 31 Jan gives 28 Feb 2027, then 31 Mar; anchor 29 Feb gives 28 Feb in non-leap years). No "mark paid" needed: dates roll forward automatically.

User stories
- As a user, I add a subscription in under 20 seconds so I do not forget it.
- As a user, I see what I spend per month so I can spot waste.
- As a user, I am warned before a renewal so I can cancel in time.

| ID | Pri | Acceptance criterion |
|---|---|---|
| AC-BILL-1 | P0 | Add bill form fields: name (required, 1-60 chars), amount (required, > 0, max 2 decimals shown in the default currency), cadence (default monthly), first/next due date (default today), reminder lead (default 3 days). Save is disabled until name and amount are valid. |
| AC-BILL-2 | P0 | Amount input accepts "12.5", "12,50" and "12" and stores integer minor units (1250, 1250, 1200). Invalid input (letters, 0, negative) shows an inline error and is not saved. |
| AC-BILL-3 | P0 | Bills list is sorted by next due date ascending; each row shows name, amount with cadence label (e.g. "9.99 / month"), next due as relative text ("in 3 days", "Today", "Tomorrow") and the date. |
| AC-BILL-4 | P0 | Next due is computed per the rules above. Test cases (today 2026-11-21): monthly anchor 2026-01-31 gives 2026-11-30; same bill on 2027-02-01 gives 2027-02-28; yearly anchor 2024-02-29 gives 2027-02-28; every 2 weeks anchor 2026-11-14 gives 2026-11-28; quarterly anchor 2026-08-21 gives 2026-11-21 (a due date of today counts as "Today", not past). |
| AC-BILL-5 | P0 | A "Monthly total" is shown at the top of Bills as the sum of monthly equivalents of active bills, in the default currency. Test: weekly 10.00 + every 2 weeks 25.00 + quarterly 30.00 + yearly 120.00 + monthly 9.99 = 43.33 + 54.17 + 10.00 + 10.00 + 9.99 = 127.49 (computed unrounded: 43.3333 + 54.1667 + 10 + 10 + 9.99 = 127.49). |
| AC-BILL-6 | P0 | The total also shows the yearly equivalent (monthly total x 12, computed from the unrounded sum). Test: the AC-BILL-5 set gives 1,529.88. |
| AC-BILL-7 | P0 | Edit and delete a bill. Delete asks no confirmation but shows a 5-second Undo; after Undo the bill is restored unchanged. |
| AC-BILL-8 | P0 | A bill can be paused (excluded from total, reminders and "Due soon", shown greyed in a "Paused" group) and resumed. |
| AC-BILL-9 | P0 | "Due soon" lists every active bill whose next due date is within its reminder lead (0, 1, 3 or 7 days; default 3) (overdue cannot occur because dates roll forward). Example: lead 3, due 2026-11-24 appears on 2026-11-21; due 2026-11-25 does not. Shown at the top of the Today tab and of the Bills tab, evaluated on every app open and every return to foreground. |
| AC-BILL-10 | P0 | Empty state on Bills shows one-line explanation and a primary "Add your first bill" button; total shows 0.00 (not blank). |
| AC-BILL-11 | P1 | Calendar export: each bill (or "Export all") downloads/shares a valid `.ics` with a VEVENT titled "<name> renews (<amount>)", all-day, recurrence matching the cadence (weekly; every 2 weeks; monthly; every 3 months; yearly), and a VALARM equal to the bill's lead days before. Opens in iOS Calendar with the "Add to Calendar" sheet. |
| AC-BILL-12 | P1 | For monthly/quarterly/yearly bills anchored on day 29-31, the `.ics` occurrences land on the last day of shorter months, matching AC-BILL-4 (31 Jan gives 28 Feb 2027, 31 Mar). If recurrence rules cannot express it, export explicit dates for the next 24 months. |
| AC-BILL-13 | P1 | Search/filter: typing in a search field filters the list by name, case-insensitive, within 100 ms for up to 200 bills. |
| AC-BILL-14 | P1 | Optional free-text note (max 200 chars) and optional category chip (Subscriptions, Utilities, Rent/Mortgage, Insurance, Other) shown on the row; no per-category charts in MVP. |
| AC-BILL-15 | P1 | Optional end date: after it passes, the bill moves to "Ended" and is excluded from totals and reminders. |
| AC-BILL-16 | P2 | Per-bill payment history, "mark as paid" and price-change tracking. |

Non-goals: multi-currency bills, auto-detect from bank/email, attachments.

## 6. HOME: Household chores and shopping

**Model.** One household per device (name + members). Members are profiles (name, colour) with a "current member" switcher ("Who is using?" at the top of the Home tab). Lists are of type chore or shopping. Sharing between phones is snapshot-based (D6, D11).

**Snapshot share.** Export of a single list (or the whole household) produces a versioned JSON snapshot: P0 via file (iOS share sheet: AirDrop/Messages/Files) and a copyable text code; P1 via a link (snapshot in the URL fragment, never sent to a server) and a QR code. Because a link/QR opens in Safari, whose storage is separate from the installed app (D3), the landing page must show a "Copy code" button and the steps to paste it in the installed app. Import merges per D11.

User stories
- As a flatmate, I add "milk" to the shopping list in two taps.
- As a parent, I assign "take out bins" to a family member with a due date.
- As a member, I see only what is mine and due soon.
- As a user, I send my shopping list to my partner's phone and merge their changes back.

| ID | Pri | Acceptance criterion |
|---|---|---|
| AC-HOME-1 | P0 | First use of Home asks for household name and at least one member name (pre-filled "Me"); up to 8 members; each gets an auto colour. Members can be added, renamed and removed in Home > Members. |
| AC-HOME-2 | P0 | Create, rename and delete lists with a type (Chores or Shopping). A new household starts with one list of each type ("Chores", "Shopping"). Up to 20 lists. |
| AC-HOME-3 | P0 | Quick add: a single text field pinned above the keyboard adds an item on Return, clears, and keeps focus so 5 items can be added in under 15 seconds. Empty or whitespace-only text is ignored. |
| AC-HOME-4 | P0 | Tapping an item's checkbox toggles done; done items move to a collapsed "Done (n)" section at the bottom, stamped with the current member and date (`doneBy`, `doneAt`). Un-checking restores it. |
| AC-HOME-5 | P0 | Shopping lists: optional quantity text (e.g. "2 x", "500 g") and a "Clear done" action that deletes all done items with a 5-second Undo. |
| AC-HOME-6 | P0 | Chore items can have an assignee (a member or "Anyone", default Anyone) and an optional due date. Assignee shows as a coloured initial chip on the row. |
| AC-HOME-7 | P0 | Filter chips "All" / "Mine" on chore lists, where Mine = assigned to the current member or "Anyone". Switching the current member changes Mine immediately. |
| AC-HOME-8 | P0 | Removing a member unassigns their open tasks (assignee becomes Anyone) and keeps their `doneBy` history as the name at the time; it never deletes tasks. |
| AC-HOME-9 | P0 | Due soon: open chores due today or earlier (overdue shown in red with "x days overdue") or within the next 2 days, for the current member or Anyone, appear on the Today tab. Example: on 2026-11-21 a chore due 2026-11-19 shows "2 days overdue". |
| AC-HOME-10 | P0 | Snapshot export of one list as a `.json` file via the iOS share sheet and as a copyable code; snapshot contains items, members referenced, `updatedAt` and `deletedAt`, plus a schema version. |
| AC-HOME-11 | P0 | Snapshot import (file picker or paste code) shows a preview ("3 new, 2 updated, 1 deleted"), then merges per item id by newest `updatedAt`; items deleted (tombstone) on the newer side stay deleted. Importing the same snapshot twice changes nothing. Corrupt or newer-schema files show a clear error and change nothing. |
| AC-HOME-12 | P0 | Item edit/delete with the 5-second Undo; all list actions work offline and persist across app restarts. |
| AC-HOME-13 | P1 | Recurring chores (daily, weekly, every 2 weeks, monthly): completing one marks it done and creates the next occurrence with due date = previous due date + interval (completing a weekly chore due 2026-11-21 creates one due 2026-11-28, even if completed late). |
| AC-HOME-14 | P1 | Share a list as a link and as a QR code; a snapshot of up to 50 items must fit a scannable QR; larger lists fall back to file export with a message. Opening the link in Safari shows the Copy code landing page described above. |
| AC-HOME-15 | P1 | App icon badge (AC-APP-15) counts Due soon bills plus the current member's due/overdue chores. |
| AC-HOME-16 | P2 | True multi-device sync with live updates and per-person logins (needs free-tier backend, D7); push notification when assigned a chore (D12); chore fairness stats; aisle grouping. |

Non-goals: per-user permissions, chat, comments, photos, live co-editing in MVP.

## 7. GOAL: Budget and savings goal calculator

**Maths.** Contributions are made at the end of each month; the first is one month from today. Let G = goal, S = current savings, c = monthly contribution, r = annual rate (default 0%), i = r/12. Months needed n = the smallest whole number with S(1+i)^n + c((1+i)^n - 1)/i >= G (at 0%: n = ceil((G - S)/c)). Target date = today + n months (same day-of-month, clamped), displayed as month and year. Reverse mode: for a target date, m = number of months from today to that date (whole months, rounded up); required c = ceil to the minor unit of (G - S(1+i)^m) x i / ((1+i)^m - 1) (at 0%: (G - S)/m). Rounding up guarantees the goal is reached.

User stories
- As a saver, I enter a goal and see how long it takes at several monthly amounts side by side.
- As a saver, I enter a deadline and see how much to put aside each month.

| ID | Pri | Acceptance criterion |
|---|---|---|
| AC-GOAL-1 | P0 | Inputs: goal name (optional), goal amount (> 0), current savings (>= 0, default 0), monthly amount (> 0). Results update live on each valid change with no "Calculate" button. |
| AC-GOAL-2 | P0 | Scenarios side by side: from one entered amount the app shows 4 columns by default (0.5x, 1x, 1.5x, 2x, each rounded to a whole currency unit, minimum 1); each amount is editable; scenarios can be added/removed (1-4). Each column shows monthly amount, months, duration as "x yrs y mo", and target month/year. |
| AC-GOAL-3 | P0 | Test (0%, today 2026-11-21): goal 5,000, saved 1,000, scenarios edited to 100 / 200 / 250 / 400 give 40 / 20 / 16 / 10 months, i.e. Mar 2030 / Jul 2028 / Mar 2028 / Sep 2027. |
| AC-GOAL-4 | P0 | Optional annual interest rate field, default 0%, accepts 0 to 20 with up to 2 decimals. Test: same inputs at 5% give 36 months for 100/month and 19 months for 200/month. |
| AC-GOAL-5 | P0 | Edge cases: current savings >= goal shows "Goal already reached"; monthly amount 0 or empty shows a prompt not "Infinity"; any scenario needing more than 1,200 months shows "More than 100 years"; goal amount 0 or empty shows no results. |
| AC-GOAL-6 | P0 | Reverse mode ("By a date"): choose a target date (must be after today, at most 50 years out) and see the required monthly amount. Test (0%): goal 5,000, saved 1,000, 12 months gives 333.34/month (4,000 / 12 = 333.33.. rounded up). |
| AC-GOAL-7 | P0 | Reverse mode with a past or same-day date shows an inline error and no result. If saved >= goal it shows "Goal already reached". |
| AC-GOAL-8 | P0 | All money is formatted in the default currency with the device locale; results are shown without scrolling horizontally at 375 px width (4 columns collapse to a 2 x 2 grid or horizontal swipe). |
| AC-GOAL-9 | P0 | Goals can be saved (name, target, current, scenarios, rate, optional target date), listed, edited and deleted (Undo 5 s). Up to 20 goals. Current savings can be updated with a single "Add to savings" action that adds to the stored amount. |
| AC-GOAL-10 | P1 | Optional monthly income in Settings; Goals shows "Left after bills" = income - monthly bill total (from AC-BILL-5) and offers it as a suggested monthly amount. Hidden when no income is set. Test: income 2,000, bills total 127.49 shows 1,872.51. |
| AC-GOAL-11 | P1 | A progress bar on saved goals (current / target, e.g. 1,000 / 5,000 = 20%). |
| AC-GOAL-12 | P1 | "Share result" via iOS share sheet as plain text (goal, amounts, dates). |
| AC-GOAL-13 | P2 | Contribution history, charts, inflation adjustment, multiple linked accounts. |

Non-goals: tracking actual bank balances, budgeting by category, financial advice (a one-line "estimate only" note is shown).

## 8. APP: Onboarding, settings, navigation, data, PWA, offline

| ID | Pri | Acceptance criterion |
|---|---|---|
| AC-APP-1 | P0 | First launch shows at most 3 skippable onboarding screens; the last asks to confirm the default currency (pre-selected from device locale, changeable from a list of ISO 4217 codes). Onboarding appears once; it is replayable from Settings. |
| AC-APP-2 | P0 | When opened in a regular Safari tab (not standalone, `navigator.standalone` false on iOS), a dismissible banner explains "Share > Add to Home Screen" with the three steps and warns that data entered in Safari will not appear in the installed app (D3). Not shown in standalone mode. |
| AC-APP-3 | P0 | Bottom tab bar with Today, Bills, Home, Goals, reachable with the thumb, each target at least 44 x 44 pt; Settings via header gear. The last open tab is restored on launch. Respects iPhone safe areas (notch, home indicator). |
| AC-APP-4 | P0 | Settings: default currency, default reminder lead (0/1/3/7 days; default 3), appearance (System/Light/Dark, default System), manage members shortcut, about/version, "Erase all data" (requires typing "ERASE"). |
| AC-APP-5 | P0 | Changing the default currency re-labels all amounts without converting numbers (1250 minor units stay 12.50), and a note states that amounts are not converted. Currencies with 0 decimals (e.g. JPY) store and show whole units. |
| AC-APP-6 | P0 | Today tab shows: monthly bill total, "Due soon" bills (AC-BILL-9) and the current member's chores (AC-HOME-9), each row tappable into the item; empty state reads "Nothing due soon" with the next upcoming bill date. |
| AC-APP-7 | P0 | All data is stored in `localStorage` as a versioned JSON envelope (IndexedDB is a later option); the app requests persistent storage (`navigator.storage.persist()`) on first run and Settings shows its status. If persistence is not granted, or storage is unavailable, the user is warned. Data survives force-quit and device restart. |
| AC-APP-8 | P0 | Export all data: Settings > "Back up" produces one `nestwise-backup-YYYY-MM-DD.json` via the iOS share sheet (fallback: download) containing every entity plus schema version and export timestamp. |
| AC-APP-9 | P0 | Import backup: file picker, validates schema, shows counts and offers Replace all or Merge (D11); invalid/corrupt/newer-version files show an error and change nothing. Round trip test: export, erase, import restores identical data (same ids, amounts, dates). |
| AC-APP-10 | P0 | Offline: after the first successful load, a service worker precaches the app shell so launching with airplane mode on opens the app in under 2 seconds with all data and all P0 features working. No feature requires a network after first load. |
| AC-APP-11 | P0 | Updates: when a new version is deployed, the next open shows "Update available, Reload" without losing unsaved input; stored data is migrated by schema version, never wiped. |
| AC-APP-12 | P0 | PWA install metadata: manifest with name "Nestwise", standalone display, 180 x 180 apple-touch-icon, theme colour, splash-safe background; app opens full-screen with no Safari chrome. |
| AC-APP-13 | P0 | Accessibility baseline: contrast >= 4.5:1 for text, Dynamic Type-friendly (layout intact at 130% text), VoiceOver labels on all icon buttons, no hover-only interactions, 16 px minimum input font size (prevents iOS zoom). |
| AC-APP-14 | P0 | Performance: first meaningful paint under 2 s on a mid-range iPhone over 4G; interactions respond under 100 ms with 200 bills and 500 list items. |
| AC-APP-15 | P1 | App icon badge: where `navigator.setAppBadge` exists (iOS 16.4+ installed app), badge = number of Due soon items, refreshed on open and on moving to background; a Settings toggle (default off) triggers the permission prompt from a tap; if unsupported or denied, the toggle explains why and nothing breaks. Badge is best-effort and can be stale until the next open (D4). |
| AC-APP-16 | P1 | Backup nudge: if there is data and no export in the last 30 days, a dismissible card on Today suggests a backup; "Last backup: date" is shown in Settings. |
| AC-APP-17 | P1 | CSV export of bills (name, amount, currency, cadence, monthly equivalent, next due). |
| AC-APP-18 | P2 | Web Push reminders (iOS 16.4+, installed app, needs sender server, D12); account + real-time sync via Supabase/Firebase free tier (D7); localisation; widgets are not possible in a PWA. |

## 9. Data model summary
All entities: `id` (UUID), `createdAt`, `updatedAt` (ISO timestamps), `deletedAt` (nullable tombstone). Dates are `YYYY-MM-DD`. Money is integer minor units.

| Entity | Fields |
|---|---|
| Settings (singleton) | currency (ISO code), schemaVersion, defaultLeadDays, appearance, monthlyIncomeMinor?, currentMemberId, badgeEnabled, lastBackupAt, onboardingDone |
| Household (singleton) | name |
| Member | name, colour |
| Bill | name, amountMinor, cadence (weekly, biweekly, monthly, quarterly, yearly), anchorDate, leadDays, status (active, paused), endDate?, note?, category? |
| List | name, type (chore, shopping), sortOrder |
| Item | listId, title, qty?, done, doneAt?, doneBy? (memberId + name snapshot), assigneeId? (chore), dueDate? (chore), repeat? (none, daily, weekly, biweekly, monthly; P1) |
| Goal | name?, targetMinor, currentMinor, scenariosMinor[] (1-4), annualRatePct (default 0), targetDate? |

Derived, not stored: next due date, monthly equivalent, monthly total, Due soon, months-to-goal.
Snapshot/backup envelope: `{app: "nestwise", schemaVersion, exportedAt, scope: "all" | "list", data}`.

## 10. MVP cut line
- **In MVP (P0):** AC-BILL-1 to 10; AC-HOME-1 to 12; AC-GOAL-1 to 9; AC-APP-1 to 14.
- **First to cut if schedule slips (P1, ships v1.1):** `.ics` export (BILL-11/12), search, notes/categories, end date, recurring chores, link/QR share, badge, income/left-after-bills, progress bar, share result, backup nudge, CSV.
- **Post-MVP (P2):** payment history, Web Push, accounts and real-time sync, localisation, chore stats.
- **Never in this product (for now):** bank connections, paid backend, native app.

## 11. Success measures (self-hosted, no analytics, measured by the owner's own use and QA)
- A new bill is added in under 20 seconds; an item is added to a list in under 5 seconds.
- Zero data loss across 30 days of daily use on a real iPhone including airplane-mode use and an app update.
- Every P0 AC passes on an iPhone running iOS 16.4+ in the installed app (QA matrix: iOS 16.4 and latest, small and large screens).

## 12. Risks
- iOS may evict PWA storage under pressure; mitigated by persist(), the backup export and the 30-day nudge.
- Separate Safari/PWA storage confuses users; mitigated by AC-APP-2 and the import landing page.
- Calendar `.ics` download inside a standalone PWA can behave differently from Safari; QA must test the share-sheet and download paths on a device.
- "Shared" being snapshot-only may disappoint; set expectations in the UI copy ("Share a copy; merge changes back by importing") and keep sync as the P2 headline.
