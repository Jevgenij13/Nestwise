# Nestwise Roadmap

Status: 2026-11-21. Source of truth for scope and AC IDs: `docs/PRD.md`. Effort sizes: S = about 1 day, M = 2-4 days, L = about 1 week of focused work. Order is by dependency, not by calendar; no dates are promised.

## Principles
- Ship the smallest thing that works on a real iPhone, in the installed app, offline.
- Every milestone ends with a QA pass on a physical iPhone (installed, airplane mode) against the listed ACs.
- $0 running cost: static hosting only until a backend is explicitly approved by the owner.
- P1 items are cut first; the MVP is done when all P0 ACs pass.

## M0: Foundations (L)
Goal: an installable, offline app shell with data storage and navigation.
- Hosting on free static HTTPS host, manifest, icons, service worker, update banner: AC-APP-10, 11, 12.
- localStorage storage layer (versioned envelope; IndexedDB later if needed) with schema versioning, tombstones, persistent storage request: AC-APP-7.
- Tab bar, safe areas, empty states, Undo pattern, appearance: AC-APP-3, 4 (partial), 13.
- Onboarding, currency selection, Safari-vs-installed banner: AC-APP-1, 2, 5.
- Exit: opens full-screen from the home screen, works offline, data survives restart.

## M1: Bills (L)
- Bill CRUD, amount parsing, cadences, next-due engine with the test table: AC-BILL-1 to 4, 7, 8, 10.
- Monthly and yearly totals: AC-BILL-5, 6.
- "Due soon" and Today tab: AC-BILL-9, AC-APP-6 (bills part).
- Exit: engine unit tests cover every date example in the PRD (month-end, leap year, today-is-due).

## M2: Home (L)
- Members, lists, quick add, done/undo, filters, assignees, due dates: AC-HOME-1 to 9, 12.
- Snapshot export/import (file + code) with merge and tombstones: AC-HOME-10, 11.
- Today tab chores: AC-HOME-9, AC-APP-6 (chores part).
- Exit: two phones can exchange a shopping list both ways and converge; double import is a no-op.

## M3: Goals (M)
- Calculator, scenarios, interest, edge cases, reverse mode: AC-GOAL-1 to 8.
- Saved goals and "Add to savings": AC-GOAL-9.
- Exit: all numeric examples in the PRD match exactly; results visible at 375 px width.

## M4: Hardening and MVP release (M)
- Backup export/import round trip: AC-APP-8, 9.
- Settings completion and Erase all data: AC-APP-4.
- Accessibility and performance passes: AC-APP-13, 14.
- Full regression on iOS 16.4 and latest iOS, small and large iPhone, installed and in Safari tab.
- Exit (MVP done): all P0 ACs pass; no known data-loss bug.

## v1.1: P1 fast-follow (each item can ship alone)
Order by value per effort:
1. Calendar `.ics` export with alarms: AC-BILL-11, 12 (M; test the share-sheet path in standalone mode).
2. Recurring chores: AC-HOME-13 (S).
3. Backup nudge and CSV export: AC-APP-16, 17 (S).
4. Link and QR share with copy-code landing page: AC-HOME-14 (M).
5. Income and "left after bills", goal progress bar, share result: AC-GOAL-10, 11, 12 (S).
6. App icon badge: AC-APP-15, AC-HOME-15 (S; best-effort on iOS).
7. Search, notes, categories, end date: AC-BILL-13, 14, 15 (S).

## v2 (P2): needs a backend, owner approval required
| Item | What it needs | Cost | Risk |
|---|---|---|---|
| Real-time shared lists and accounts (AC-HOME-16) | Supabase or Firebase Spark free tier, auth, conflict handling, privacy notice | $0 within free quotas (verify current limits and inactivity pausing before committing) | Breaks "no account"; hosted dependency |
| Web Push reminders (AC-APP-18) | iOS 16.4+, installed app, push subscription store, sender (e.g. free Cloudflare Worker cron + VAPID keys) | $0 at small scale | A server must exist; permission prompts reduce adoption |
| Payment history, price changes (AC-BILL-16) | Local only | $0 | Data model change (migration) |
| Contribution history, charts (AC-GOAL-13) | Local only | $0 | None |
| Localisation, chore stats | Local only | $0 | String extraction effort |

## Decisions needed from the owner
1. Hosting choice for the free static host (default if no answer: GitHub Pages) and the final public URL, since the install is tied to it.
2. Whether true real-time sync is wanted as the v2 headline (changes the product from "no account" to "optional account").

## Cut order if time is short
1. Drop everything in v1.1 (already outside MVP).
2. Within MVP: keep AC-HOME-10/11 (file and code sharing) before polish; defer AC-GOAL-9 (saved goals) before touching the calculator itself; never cut AC-APP-8/9 (backup) or AC-APP-10 (offline).
