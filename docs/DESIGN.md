# Nestwise Design

Status: v1.0, 2026-11-21. Owner: Design. Readers: development, QA, product.
Source of scope: `docs/PRD.md` (AC IDs cited as `AC-xxx-n`; priorities P0/P1/P2 as in the PRD). Tokens: `src/styles/tokens.css`. Icons: `public/icons/`.
Where this document makes a decision the PRD leaves open, it is marked **(Design decision)** so product can overrule it.

Contents: 1 Identity, 2 Foundations, 3 Navigation and app shell, 4 Components, 5 Screens, 6 Key flows, 7 Microcopy, 8 Screen to AC map, 9 Handoff notes.

---

## 1. Identity

**Name:** Nestwise. A nest is a small, safe place you build for the people you live with; "wise" is the quiet part about knowing where your money and your chores stand. The app should feel like a tidy kitchen table, not a bank.

**Personality:** warm, calm, trustworthy, a little homely. It never shouts, never guilt-trips, never uses finance jargon.

**Visual language**
- Warm cream backgrounds, white cards, terracotta "clay" as the single brand colour, moss green for growth/goals, amber for "due soon", brick red only for real problems (overdue, errors, delete).
- Soft, generous radii (14-28 px), light shadows, no hard dividers where spacing will do.
- SF Pro (system font) with SF Rounded only for the big monthly number and goal results, which gives numbers a friendly face.
- Icon: an egg resting in a woven nest on a clay background (`public/icons/icon.svg`).

**Tone of voice** (details in section 7)
- Plain, second person, present tense: "You pay 127.49 a month."
- Short. One idea per sentence. No exclamation marks except onboarding welcome.
- Honest about limits: "Estimates only", "Share a copy; merge changes back by importing", "Saved on this phone only".
- Errors say what to do, not what went wrong: "Enter an amount above 0."

**Design principles**
1. **One hand, 30 seconds.** Primary actions sit in the lower half of the screen. Adding a bill is under 20 seconds (name, amount, Save); adding a list item is under 5 seconds.
2. **Answer the question first.** Every tab opens with its answer (what is due, what I pay, who does what, how long to the goal) before any controls.
3. **Never lose data.** Delete is instant with a 5 second Undo; destructive wipes need typing ERASE; backup is always one tap away.
4. **Honest, not magic.** Offline, local-only and snapshot-sharing limits are said in plain words where they matter.
5. **State is never colour alone.** Overdue = red + warning icon + words. Due soon = amber + clock icon + words. Done = green + check + strikethrough.
6. **Native feel.** Bottom tab bar, large titles, bottom sheets, swipe actions, safe areas, no hover-only anything.

---

## 2. Foundations

### 2.1 Colour (tokens in `tokens.css`)

Light and dark are both complete. Theme selection (AC-APP-4): no attribute follows the system; `<html data-theme="light|dark">` forces a choice.

| Role | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | #fbf6ef | #181310 | App background |
| `--color-surface` | #ffffff | #241d18 | Cards, rows, sheets |
| `--color-surface-2` | #f7f0e6 | #2e261f | Inputs, chips, pressed rows |
| `--color-text` / `-2` / `-3` | #2b2118 / #65574a / #73645a | #f6ede2 / #c4b5a5 / #a39484 | Primary / secondary / tertiary text |
| `--color-primary` | #b04e27 | #f0976f | Buttons, active tab, links |
| `--color-accent` | #4f7455 | #8fbf94 | Goals, progress, toggles |
| `--color-success-*` | green | green | Done, goal reached |
| `--color-due-soon-*` | amber | amber | Due soon (AC-BILL-9, AC-HOME-9) |
| `--color-overdue-*` | brick red | coral | Overdue, errors, delete |
| `--color-info-*` | blue | blue | Tips, install banner |
| `--member-1..8` | clay, lake, moss, plum, ochre, berry, teal, olive | same (two nudged for dark) | Member colours, assigned in order (AC-HOME-1) |

Each semantic colour has a solid (`--color-x`), a soft background (`--color-x-soft`) and a text colour (`--color-x-text`) tuned to read on both bg and the soft background. Use `-text` for text and icons on soft backgrounds; use the solid only for fills with white (or `--color-on-danger`) text.

**Contrast (WCAG AA, measured on the token values; AC-APP-13)**

| Pair | Light | Dark |
|---|---|---|
| text on bg | 14.6 | 15.9 |
| text-2 on bg | 6.5 | 9.2 |
| text-3 on surface | 5.7 | 5.6 |
| on-primary on primary (buttons) | 5.3 | 8.2 |
| primary-text on surface | 6.6 | 8.3 |
| due-soon-text on due-soon-soft | 6.7 | 8.0 |
| overdue-text on overdue-soft | 6.4 | 7.4 |
| success-text on success-soft | 6.9 | 8.4 |
| white on swipe actions (edit / pause / delete) | 6.8 / 6.4 / 6.5 | same |
| toast text / toast action on toast | 14.6 / 9.5 | 13.6 / 5.7 |
| white initial on every member colour | at least 4.5 | at least 4.5 |

`--color-text-disabled` is decorative only (disabled button labels, which are also marked `aria-disabled`).
Non-text controls (checkbox border, toggle on-state) are at least 3:1 against the surface.

### 2.2 Typography

System font stack (`--font-sans`), rem units so the layout scales with the user's text size. Base 16 px = 1rem. Minimum rendered size is 12 px (`--text-caption`). All inputs use 17 px (`--text-body`), which stays above the 16 px iOS zoom threshold (AC-APP-13).

| Style | Size | Weight | Use |
|---|---|---|---|
| Hero number | 44 px rounded bold | 700 | Monthly total, goal result |
| Large title | 34 px | 700 | Screen titles, collapses on scroll |
| Title 1 / 2 / 3 | 28 / 22 / 20 px | 700 / 600 / 600 | Sheet titles, empty-state heading |
| Headline | 17 px | 600 | Row titles, buttons |
| Body | 17 px | 400 | Inputs, paragraphs |
| Callout / Subhead | 16 / 15 px | 400 | Secondary lines |
| Footnote / Caption | 13 / 12 px | 400 / 500 | Hints, dates, tab labels, section headers (caps) |

Numbers (money, dates, counts, months) always use `font-variant-numeric: tabular-nums` (class `.num` / `.money`). Amounts are right-aligned and never wrap.

### 2.3 Spacing, radius, elevation, layout

- Spacing 4 pt scale (`--space-1` 4 ... `--space-16` 64); screen gutter 16 px (`--gutter`).
- Radii: tags 6, inputs 10, grouped rows 14, cards 20, sheets 28, pills full.
- Shadows are warm brown-tinted and light (`--shadow-1/2/3`); in dark mode they deepen and cards rely on surface contrast instead.
- Row minimum height 56 px, input 48 px, primary button 52 px, tap target never under 44 x 44 (`--tap-min`).
- Content max width 640 px, centred, for iPad/desktop (not a target, must not break).

### 2.4 Motion

Subtle and spring-like, always honouring `prefers-reduced-motion` (tokens collapse durations to 1 ms and remove overshoot and press-scale).

| Interaction | Duration / easing |
|---|---|
| Press feedback (scale 0.97) | 90 ms, `--ease-out` |
| Checkbox tick, chip select | 160 ms, `--ease-standard` |
| Swipe settle, row removal, list reorder | 260 ms, `--ease-out` |
| Sheet present/dismiss | 380 ms, `--ease-sheet` (iOS curve) |
| Toast in | 260 ms, `--ease-spring` (slight overshoot); out 160 ms |
| Tab change | 160 ms cross-fade, no slide |

Rules: never block input during animation; never rely on `transitionend` to change state; no looping or parallax animation. With reduced motion, sheets and toasts appear and disappear instantly.

### 2.5 Iconography

Outline icons, 24 px grid, 1.75 px stroke, rounded caps (SF Symbols style; the developer may hand-draw inline SVGs, no icon font). Required: sun-or-calendar-check (Today), receipt (Bills), house (Home), target-flag (Goals), gear, plus, chevron-right, check, clock, warning-triangle, pause, play, trash, pencil, share, repeat, person, calendar, close. Every icon-only button has an `aria-label` (AC-APP-13).

### 2.6 Accessibility baseline (AC-APP-13)

- Text contrast at least 4.5:1, non-text at least 3:1 (see table).
- Layout verified at 375 x 667 and at 130% text size: rows grow in height, two-line titles allowed, chips wrap, side-by-side pairs stack. Nothing scrolls horizontally except the optional goal scenario swipe (section 5.7), and nothing is clipped.
- VoiceOver: every row reads as one sentence ("Netflix, 9.99 per month, due in 3 days, Saturday 24 November"); the checkbox is a labelled button; sheets trap focus, are `role="dialog"` with `aria-modal`, and return focus to the trigger; toasts use `role="status"`.
- Swipe actions are a shortcut, never the only path: every swipe action also exists in the row's tap-through detail or edit sheet.
- No hover-only affordances; focus rings via `:focus-visible` for external keyboards and Switch Control.

---

## 3. Navigation and app shell

### 3.1 Model

Four tabs, a Settings gear, sheets for creation and editing. No hamburger, no nested tab bars.

```
 +--------------------------------------+
 | (status bar / notch, safe-area-top)  |
 |  Large title                    (gear)|  <- header, 44pt actions
 |--------------------------------------|
 |                                      |
 |            scrolling content         |
 |                                      |
 |                          ( + Add )   |  <- floating add pill (Bills, Goals)
 |--------------------------------------|
 |  Today   Bills    Home    Goals      |  <- tab bar, 49pt + safe-area-bottom
 |            (home indicator)          |
 +--------------------------------------+
```

- **Tabs (AC-APP-3):** Today, Bills, Home, Goals. Each tab target is the full quarter width by 49 pt (above the 44 minimum). Active tab: `--color-primary` icon and label plus a filled icon variant (not colour alone). A small amber dot or count on Today and Bills when Due soon is non-empty, with `aria-label="Today, 3 due soon"`.
- **Settings:** gear button top right of every tab header, 44 x 44, opens Settings as a full-height sheet **(Design decision)**: it is a modal destination so the tab bar and the tab's own scroll position stay untouched.
- **Last tab restored on launch (AC-APP-3):** remember the active tab id (and, for Home, the open list) in settings storage; default Today on first launch.
- **Re-tapping the active tab** scrolls to top and, inside Home, pops to the lists overview.
- **Safe areas:** header gets `padding-top: var(--safe-top)`; tab bar `padding-bottom: var(--safe-bottom)`; scroll content gets bottom padding of tab bar + safe-bottom + 88 px when a floating add button exists. Sides use `--safe-left/right` for landscape.
- **Header behaviour:** large title (34 px) collapses to a 17 px centred title on scroll with a blurred translucent background (`backdrop-filter`, falling back to `--color-bg`).
- **Keyboard:** when the keyboard is open the tab bar hides (avoids it floating above the keyboard); quick-add bars and sheet footers ride above the keyboard using `visualViewport` (section 9).
- **Back:** Home list detail pushes with a "Home" back button top left and supports the iOS edge-swipe back gesture where the browser provides it; no custom edge-swipe is required.

### 3.2 Global banners and overlays order (z-order)
Header and tab bar < banners < scrim < sheet < toast (`--z-*` tokens).

---

## 4. Components

### 4.1 Tab bar
- Height 49 + safe-bottom, background `--color-surface` at 92% opacity with blur, 0.5 px top separator.
- Item: icon 26 px over 12 px label (caption, weight 500), vertical stack, centred.
- States: inactive `--color-text-2`; active `--color-primary` + filled icon; pressed scale 0.97 (not under reduced motion); badge dot 8 px `--color-due-soon` with 2 px surface ring, plus hidden text for VoiceOver.
- `role="tablist"`, items `role="tab"` with `aria-selected`.

### 4.2 List row with swipe actions
```
 +----------------------------------------------+
 | [icon/check]  Title (headline, 1-2 lines)   9.99 |
 |               subtitle (subhead, text-2)  / month |
 +----------------------------------------------+
   min height 56px, padding 12px 16px, radius 14 in grouped cards
```
- Left slot (optional): checkbox 28 px visual in a 44 x 44 hit area, or category/assignee chip.
- Right slot: money text, right-aligned, tabular; secondary cadence label under or beside it.
- Whole row is a button (opens detail/edit). Pressed = `--color-surface-2`.
- **Swipe left** reveals up to 2 actions, each 76 pt wide, white label + icon on solid colour (colours in `--color-swipe-*`); **full swipe** triggers the first (rightmost) action. Delete is always the rightmost and its full-swipe runs delete + Undo toast (safe because of Undo, AC-BILL-7, AC-HOME-12).
  - Bill: Pause (amber) / Delete (red). Paused bill: Resume (green) / Delete.
  - Chore: Edit (blue) / Delete (red). Shopping: Delete (red).
- **Swipe right** on chore/shopping rows: Done (green, check) with full swipe toggling done (AC-HOME-4).
- Swipe threshold 72 pt, rubber-band past the actions, vertical scroll wins if the gesture angle is more than 30 degrees from horizontal; one row open at a time; tapping elsewhere closes it.
- Discoverability: the first time a list has at least one row, the first row nudges 24 px left and back (once, skipped under reduced motion). Alternative path for all swipe actions: tap row -> sheet.
- Row states: normal, pressed, swiping, paused (text-3, "Paused" pill), done (strikethrough, text-3, green check), overdue (red text + warning icon + words), due soon (amber pill with clock icon + words).

### 4.3 Bottom sheet
```
 +--------------------------------------+
 |             -------  (grabber 36x5)  |
 |  Cancel          Title               |   <- header, Cancel 44pt left
 |--------------------------------------|
 |  scrolling form / content            |
 |                                      |
 |--------------------------------------|
 |  [          Primary action        ]  |   <- sticky footer above keyboard
 +--------------------------------------+
```
- Corner radius 28 top; scrim `--color-overlay`; shadow `--shadow-sheet`; max height 92% of the viewport (leaves a peek of the screen behind, as on iOS).
- Detents: **medium** (about 60%, for the member switcher, pickers, share) and **large** (forms, detail). Forms open large.
- Dismiss: Cancel button, scrim tap, drag down on grabber/header. If the form is dirty, dismiss by gesture shows "Discard changes?" with Discard / Keep editing; Cancel button also asks when dirty.
- Primary action is a full-width 52 px button in the sticky footer (thumb reach); it is disabled (not hidden) until valid and tells why via the inline hint (AC-BILL-1).
- First text field autofocuses on Add sheets only (not on Edit, to avoid a keyboard jump).
- Safe-bottom padding on the footer; `role="dialog"`, `aria-modal="true"`, focus trap, focus returns to the trigger.

### 4.4 Chips
| Type | Spec | Used for |
|---|---|---|
| Filter chip | 36 px tall visual in a 44 px hit area, pill, `--color-surface-2`; selected = `--color-primary` fill, on-primary text, check icon | All / Mine (AC-HOME-7), list picker |
| Choice chip | Same size; wraps to multiple lines; single-select, `role="radio"` | Cadence, reminder lead, repeat, scenarios |
| Assignee chip | 28 px circle, member colour, white initial; "Anyone" = outlined circle with a person icon; sits left of the title or in the row's trailing meta | AC-HOME-6 |
| Status pill | 24 px tall, soft background, icon + words: "Due in 3 days" (amber, clock), "2 days overdue" (red, warning), "Paused" (grey, pause), "Done 21 Nov" (green, check) | AC-BILL-8/9, AC-HOME-9 |
| Category chip (P1) | 24 px, surface-2, text only | AC-BILL-14 |

### 4.5 Money text
- Formatted with `Intl.NumberFormat(locale, {style:'currency', currency})`, the default currency from settings; decimals follow the currency (JPY 0, per AC-APP-5). Minor units are converted only at display.
- Tabular figures, right-aligned, `white-space: nowrap`, never truncated. Cadence suffix (" / month", " / week", " / 2 weeks", " / quarter", " / year") in `--text-footnote`, `--color-text-2`, on the second line under the amount in rows.
- Sizes: row 17 px semibold; card total 44 px rounded bold; result columns 22 px semibold.
- Large values: the hero number scales down in steps (44, 36, 28) to fit one line at 375 px instead of wrapping.
- Per-row amounts are rounded individually; the total is rounded once from unrounded values (PRD section 5). A footnote under the Bills total states "Rows are rounded; the total is calculated before rounding."

### 4.6 Empty state
```
        (  illustration: line icon 64px  )
              Heading (title 3)
        One-line explanation (subhead,
        text-2, max 28ch, centred)
        [     Primary action     ]
```
Centred in the available space, above the tab bar, never a blank screen. One primary action max, secondary text link optional. Icons are tinted `--color-primary-text` on a `--color-primary-soft` circle.

### 4.7 Toast and Undo (AC-BILL-7, AC-HOME-5, AC-HOME-12, AC-GOAL-9)
```
 +----------------------------------------+
 | Netflix deleted                  Undo  |
 +----------------------------------------+
```
- Pill/rounded 14 px, inverted colours (`--color-toast-*`), 52 px tall, 16 px from the sides, floats 12 px above the tab bar (or above the keyboard bar).
- 5 second timer for undoable actions (visible as a thin progress line under the text, hidden under reduced motion); plain confirmations ("Copied") use 2.5 seconds without an action.
- Undo target is 44 x 44 minimum, text 17 px semibold, `--color-toast-action`.
- One toast at a time: a new destructive action commits the previous one and replaces the toast. Navigating tabs does not dismiss it.
- `role="status"`, `aria-live="polite"`; the Undo button is focusable. Swipe the toast sideways or tap away to dismiss without undoing.

### 4.8 Other primitives
- **Primary button:** 52 px, radius 14, fill `--color-primary`, text `--color-text-on-primary`; disabled = `--color-surface-3` with `--color-text-disabled` and `aria-disabled`. Secondary: surface-2 fill, primary-text label. Destructive: text-only red or red fill with `--color-on-danger`.
- **Text field:** 48 px, radius 10, surface-2 fill, 17 px text, label above (footnote, text-2), error text below in `--color-overdue-text` with a warning icon, border 1.5 px overdue on error. Money fields: `inputmode="decimal"`, right-aligned, currency symbol as a fixed prefix.
- **Segmented control:** 36 px, 2 to 3 segments, iOS style (pill thumb slides, instant under reduced motion).
- **Checkbox:** 28 px round, 2 px `--color-checkbox-border`; checked = filled `--color-success` with a white tick and the row title struck through.
- **Toggle:** 51 x 31 pt, on = `--color-toggle-on`.
- **Banner / info card:** radius 20, soft background, icon left, text, trailing close button (44 pt).
- **Progress bar (P1, AC-GOAL-11):** 8 px, track `--color-surface-3`, fill `--color-accent`, label "20%" in text plus a `role="progressbar"` with values.
- **Dialog (confirm):** centred, 270 pt wide, iOS alert style; used only for Discard changes and Remove member.
- **Grouped section:** header in `.t-section` caps style above a card of rows with 0.5 px inset separators.

---

## 5. Screens

Wireframes are 38 characters wide, which approximates a 390 pt phone. `[ ]` is a button or field, `( )` an icon button, radio or chip, `(*)` a selected radio, `>` or `v` a chevron. States listed per screen: Empty, Filled, Error. There is no loading state because all data is local and synchronous from the user's view (AC-APP-14); the only "loading" is the first-launch splash (the background colour `--color-bg` plus the icon centred, as the manifest background colour).

### 5.1 Today (AC-APP-6, AC-BILL-9, AC-HOME-9)

Purpose: the whole day in one glance, no navigation required.

```
+--------------------------------------+
| Today                           (gear) |
| Saturday 21 November      (A) Anna v   |
|                                      |
| +----------------------------------+ |
| | You pay about                    | |
| |            127.49  a month       | |   <- hero number
| | 1,529.88 a year                  | |
| +----------------------------------+ |
|                                      |
| DUE SOON                             |
| +----------------------------------+ |
| | (receipt) Netflix       9.99     | |
| |  (clock) In 3 days · Tue 24 Nov  | |
| |----------------------------------| |
| | (receipt) Water bill   32.00     | |
| |  (clock) Tomorrow · Sun 22 Nov   | |
| +----------------------------------+ |
|                                      |
| YOUR CHORES                          |
| +----------------------------------+ |
| | ( ) Take out bins          (A)   | |
| |  (!) 2 days overdue              | |
| |----------------------------------| |
| | ( ) Vacuum                (Any)  | |
| |  (clock) Today                   | |
| +----------------------------------+ |
|                                      |
| +- Back up your data ------------ x -+ |   <- P1 nudge (AC-APP-16)
| | Last backup was 41 days ago.     | |
| | [ Back up now ]                  | |
| +----------------------------------+ |
|--------------------------------------|
|  Today*  Bills   Home   Goals        |
+--------------------------------------+
```

- **Header:** large title "Today", subtitle is today's date; the member chip "(A) Anna v" opens the member switcher sheet (5.6) so "my chores" can change in one tap (AC-HOME-7 semantics apply: Mine = assigned to the current member or Anyone).
- **Monthly total card** (AC-APP-6, AC-BILL-5/6): hero number in rounded 44 px, "a month"; yearly line below. Shows `0.00` with no bills, never blank (AC-BILL-10). Tapping it opens Bills.
- **Due soon bills** (AC-BILL-9): active bills within their lead window, ordered by next due. Row: receipt icon, name, amount right, status pill "In 3 days . Tue 24 Nov" (amber, clock). Due today = "Today". Tap opens Bill detail (5.4).
- **Your chores** (AC-HOME-9): open chores for the current member or Anyone due today, earlier or within 2 days. Overdue: red text, warning icon and the words "2 days overdue". Checkbox completes inline (Undo toast), swipe actions as chore rows. Tap opens the item sheet.
- Order: overdue chores first inside the chores group; the bills group sits above the chores group because bills cost money.
- **Backup nudge (P1, AC-APP-16):** dismissible card at the bottom; dismiss hides until 7 days later **(Design decision)**.
- Re-evaluated on every open and every return to foreground (`visibilitychange`, AC-BILL-9).

States
- **Empty (AC-APP-6):** monthly total card still shown. Below it an empty state: heading "Nothing due soon", body "Your next bill is Netflix on Tuesday 24 November." (or "No bills yet. Add one to see it here." with a [ Add a bill ] button when no bills exist). If chores exist but none are due, the "Your chores" group is omitted.
- **First launch, no data:** total 0.00, empty state with two secondary text actions: "Add a bill" and "Open Home".
- **Overdue only:** the chores group is shown; bills group omitted.
- **Error:** none expected; if storage fails to open, a full-screen message "Nestwise can't open its storage. Close the app and open it again. If this keeps happening, restore a backup in Settings." with [ Try again ].

### 5.2 Bills list (AC-BILL-3, 5, 6, 8, 9, 10; P1: 13, 14, 15)

```
+--------------------------------------+
| Bills                           (gear) |
|                                      |
| +----------------------------------+ |
| | Monthly total                    | |
| |             127.49 / month       | |
| | 1,529.88 / year                  | |
| +----------------------------------+ |
|  (i) Rows are rounded; the total     |
|      is calculated before rounding. |   <- footnote
|                                      |
| [ Search bills                  ]    |   <- P1, AC-BILL-13
|                                      |
| DUE SOON                             |
| (rows, amber pills, as in Today)     |
|                                      |
| ALL BILLS · 5                        |
| +----------------------------------+ |
| | Netflix           9.99  / month  | |
| | Tomorrow · Sun 22 Nov            | |
| |----------------------------------| |
| | Rent             900.00 / month   | |
| | In 9 days · Mon 30 Nov           | |
| |----------------------------------| |
| | Gym             120.00 / year    | |
| | In 3 months · Fri 12 Feb         | |
| +----------------------------------+ |
|                                      |
| PAUSED · 1                           |
| | Spotify (greyed)  [Paused]  5.99 | |
|                                      |
|                         ( + Add bill ) |   <- floating pill, above tab bar
|--------------------------------------|
|  Today   Bills*  Home   Goals        |
+--------------------------------------+
```

- **Total card** (AC-BILL-5/6): monthly sum of active bills and the yearly equivalent from the unrounded sum; always visible, `0.00` when empty (AC-BILL-10).
- **Due soon** section on top (AC-BILL-9) is a shortcut view; the same bills also appear in All bills, carrying their amber pill, so the list is complete and sorted.
- **All bills** sorted by next due ascending (AC-BILL-3). Row: name (headline), amount + cadence label (right, "9.99 / month"), subtitle "relative text . date" ("Today", "Tomorrow", "In 3 days", "In 3 months"; relative text switches to "In n days" up to 31 days, then months). Swipe: Pause / Delete (AC-BILL-7/8).
- **Paused** group (AC-BILL-8): collapsed by default when it has more than 3 rows; rows greyed (`--color-paused-text`), "Paused" pill, no next due date, excluded from total, swipe: Resume / Delete.
- **Ended** group (P1, AC-BILL-15): same treatment, label "Ended 3 Jan".
- **Add:** floating pill (56 px tall, `--color-primary`) bottom right above the tab bar, thumb-reachable; opens the Add sheet (5.3). In the header there is no duplicate "+".
- **Search (P1, AC-BILL-13):** field appears when pulling the list down; filters by name as you type; no results shows "No bills match "xyz"".
- Category chip and note (P1, AC-BILL-14): chip shown at the start of the subtitle; note not shown in the row, only in detail.

States
- **Empty (AC-BILL-10):** total card shows 0.00. Empty state: icon receipt, heading "No bills yet", body "Add subscriptions and bills to see what you pay each month.", [ Add your first bill ]. The floating pill is hidden in the empty state to avoid two add buttons.
- **Filled:** as drawn. **All paused:** total 0.00, active list empty with the one-line "All your bills are paused.", Paused group visible.
- **Search no result:** inline text, list cleared.

### 5.3 Bill add / edit sheet (AC-BILL-1, 2, 7, 8; P1: 14, 15)

```
+--------------------------------------+
|              -------                 |
| Cancel        New bill               |
|--------------------------------------|
| Name                                 |
| [ Netflix                         ]  |
|                                      |
| Amount                               |
| [ EUR                       9.99 ]   |
| = 9.99 / month                       |   <- live monthly equivalent
|                                      |
| How often                            |
| (Weekly)(Every 2 weeks)(*Monthly*)   |
| (Quarterly)(Yearly)                  |
|                                      |
| Next due date                        |
| [ Tue 24 Nov 2026               > ]  |
|                                      |
| Remind me                            |
| (On the day)(1 day)(*3 days*)(1 week)|
|                                      |
| (P1) Category  (Subscriptions v)     |
| (P1) Note      [                  ]  |
| (P1) End date  [ None           > ]  |
|                                      |
|--------------------------------------|
| [            Save bill             ] |   <- disabled until valid
+--------------------------------------+
```

- **Fields (AC-BILL-1):** Name (required 1-60 chars, counter appears at 50), Amount (required > 0), How often (default Monthly), Next due date (default today; label "Next due date" in Add, same field edits the anchor), Remind me (default is the Settings default lead, 3 days).
- **Amount (AC-BILL-2):** `inputmode="decimal"`, accepts "12.5", "12,50", "12"; stored as minor units; errors: letters, 0, negative. The live line under the field shows the monthly equivalent for non-monthly cadences ("= 43.33 / month") and a plain "= 9.99 / month" for monthly. Never converts before user has typed a valid amount.
- **Date:** native `<input type="date">` styled as a row (iOS wheel), value `YYYY-MM-DD` (D9). Past dates are allowed (anchors) and are rolled forward; helper text shows "Next payment: Tue 24 Nov" computed live (AC-BILL-4).
- **Save** is disabled until name and amount are valid; a hint line above the button says what is missing ("Add a name to save") rather than silently disabling. Return on the amount field saves if valid.
- **Edit mode:** title "Edit bill", Save becomes "Save changes"; below the footer fields, a group with [ Pause bill ] (or [ Resume bill ]) and [ Delete bill ] (red text). Delete closes the sheet and shows the Undo toast, no confirmation (AC-BILL-7).
- **Error states:** inline per field in red with icon: Name "Add a name" / "Keep it under 60 characters"; Amount "Enter an amount above 0" (AC-BILL-2) shown after blur or on Save attempt, never while the user is still typing the first character.
- **Currency:** fixed prefix/suffix from the default currency (code or symbol); to change it the user goes to Settings (AC-APP-5).

### 5.4 Bill detail (AC-APP-6 "tappable into the item"; AC-BILL-3, 7, 8; P1: 11, 12, 14)

Large-detent sheet. All actions of the swipe row live here.

```
+--------------------------------------+
|              -------                 |
| Close                        Edit    |
|--------------------------------------|
|  Netflix                             |
|  Subscriptions (P1)                  |
|                                      |
|          9.99 / month                |
|          = 119.88 / year             |
|                                      |
| +----------------------------------+ |
| | Next payment   Tue 24 Nov (3 days)| |
| | Then           Thu 24 Dec        | |
| |                Sun 24 Jan        | |
| | Reminder       3 days before     | |
| | Paying since   24 Jan 2025       | |   <- anchor date
| +----------------------------------+ |
|                                      |
| Note (P1): Family plan, cancel...    |
|                                      |
| [ Add to calendar ]  (P1, BILL-11)   |
| [ Pause bill ]                       |
| [ Delete bill ]            (red)     |
+--------------------------------------+
```

- Shows the next three occurrences so the user can plan cancelling in time.
- **Paused:** banner "Paused. Not counted in your total or reminders." with [ Resume ] primary.
- **Add to calendar (P1):** produces the `.ics` via share sheet / download (AC-BILL-11/12); labelled "Add renewals to Calendar".
- **Delete:** closes the sheet, removes the row, Undo toast "Netflix deleted. Undo" (AC-BILL-7).

### 5.5 Home: lists overview and list screens (AC-HOME-1 to 9, 12; P1: 13)

**Home root** shows the member switcher, the lists and an add-list button.

```
+--------------------------------------+
| Home                            (gear) |
| The Smith household                  |
|                                      |
| Who is using?                        |
| +----------------------------------+ |
| | (A) Anna                    v    | |   <- opens member switcher (5.6)
| +----------------------------------+ |
|                                      |
| LISTS                                |
| +----------------------------------+ |
| | (check) Chores                   | |
| |  3 open · 1 due soon          >  | |
| |----------------------------------| |
| | (cart) Shopping                  | |
| |  7 items                      >  | |
| +----------------------------------+ |
|                                      |
| [ + New list ]                       |
|--------------------------------------|
|  Today   Bills   Home*  Goals        |
+--------------------------------------+
```

- Lists are cards with a type icon (checklist for Chores, cart for Shopping), counts, and a chevron. A new household starts with "Chores" and "Shopping" (AC-HOME-2). Max 20 lists; at 20 the button reads "List limit reached (20)" and is disabled.
- **New / rename list:** small medium-detent sheet: name field, type choice chips (Chores / Shopping; type is fixed after creation, shown read-only on rename). Delete list lives in the list's "..." menu with the standard Undo toast.
- Swipe left on a list card: Rename (blue) / Delete (red).

**First use setup (AC-HOME-1):** shown instead of the root until a household exists.

```
+--------------------------------------+
| Set up your household                |
| Share chores and shopping with the   |
| people you live with.                |
|                                      |
| Household name                       |
| [ Home                            ]  |
|                                      |
| Who lives here?                      |
| (A) [ Me                        ]    |
| (+) Add another person   (up to 8)   |
|                                      |
| [          Start using Home        ] |
+--------------------------------------+
```
Pre-filled "Me" for the first member; each new member gets the next `--member-n` colour automatically; Start is enabled with a household name and at least one member name.

**Chores list (AC-HOME-3, 4, 6, 7, 8, 9, 12; P1 AC-HOME-13)**

```
+--------------------------------------+
| < Home       Chores            ( ... ) |
|                                      |
| (All) (Mine)                         |   <- filter chips (AC-HOME-7)
|                                      |
| +----------------------------------+ |
| | ( ) Take out bins           (A)  | |
| |  (!) 2 days overdue              | |
| |----------------------------------| |
| | ( ) Vacuum                (Any)  | |
| |  (clock) Today · weekly (P1)     | |
| |----------------------------------| |
| | ( ) Clean bathroom          (B)  | |
| |  Sat 28 Nov                      | |
| +----------------------------------+ |
|                                      |
| > Done (2)                           |   <- collapsed
|                                      |
|--------------------------------------|
| [ Add a chore...                 ]   |   <- quick add above keyboard
+--------------------------------------+
```

- **Rows (AC-HOME-6):** checkbox, title, assignee chip right (coloured initial, or "Anyone" outlined), subtitle = due text ("Today", "Tomorrow", "Sat 28 Nov", or "2 days overdue" red with icon, AC-HOME-9); P1 repeat shows a repeat icon and "Weekly".
- **Quick add (AC-HOME-3):** one text field pinned above the keyboard (above the tab bar when the keyboard is closed; the tab bar hides while typing). Return adds, clears and keeps focus; empty or whitespace-only is ignored silently; the new row slides in at the top of Open and a light haptic-style flash highlights it (no sound). New chore defaults to Anyone, no due date (AC-HOME-6); tap the row to set assignee/due.
- **Done (AC-HOME-4):** tapping the checkbox moves the item to the collapsed "Done (n)" section stamped with current member and date (shown as "Anna . 21 Nov" in the expanded Done group); unchecking restores it. With recurrence (P1, AC-HOME-13) completing creates the next occurrence and the toast reads "Done. Next one: Sat 28 Nov. Undo".
- **Filter (AC-HOME-7):** All / Mine; Mine = assigned to current member or Anyone; switching member in the sheet updates the list immediately. The current choice is remembered per list.
- **"..." menu:** Rename list, Share list (5.9), Clear done (shopping only), Delete list.
- **Item edit sheet (medium detent):** Title field; Assigned to (choice chips: Anyone + each member with their coloured circle); Due date (chips "No date / Today / Tomorrow / Pick..." which opens the native date picker); Repeat (P1: None / Daily / Weekly / Every 2 weeks / Monthly); [ Delete ] red. Save is automatic on close for edits (changes apply as chosen) **(Design decision)** with a [ Done ] button.
- **Delete / edit:** Undo toast 5 s (AC-HOME-12). All actions work offline and persist.

States
- **Empty list:** icon, heading "Nothing to do", body "Add the first chore below.", the quick-add field is focused-ready but does not auto-open the keyboard.
- **Mine filter empty:** "Nothing for you. Enjoy the quiet." with a text link "Show all".
- **All done:** open list empty, Done (n) visible: "All done. Nice."
- **Removed assignee:** rows silently show Anyone (AC-HOME-8).

**Shopping list (AC-HOME-3, 4, 5, 12)**

```
+--------------------------------------+
| < Home       Shopping          ( ... ) |
|                                      |
| +----------------------------------+ |
| | ( ) Milk                    2 x  | |
| |----------------------------------| |
| | ( ) Bread                        | |
| |----------------------------------| |
| | ( ) Pasta                 500 g  | |
| +----------------------------------+ |
|                                      |
| > Done (3)              [ Clear done ] |
|                                      |
|--------------------------------------|
| [ Add an item...                 ]   |
+--------------------------------------+
```

- No assignee or due date (AC-HOME-5); optional quantity text shown right in text-2 ("2 x", "500 g"), set from the item sheet (Title + Quantity fields only).
- **Clear done (AC-HOME-5):** visible when Done has items; deletes all done items and shows "3 items cleared. Undo" for 5 s.
- Shopping rows only offer Delete on swipe left and Done on swipe right.
- **Empty:** icon cart, heading "Your list is empty", body "Add what you need below. You can send a copy to your partner from the ... menu."

### 5.6 Member switcher and members (AC-HOME-1, 7, 8; AC-APP-4)

Medium-detent sheet, opened from the Home root, the Today header chip, and Settings > Members.

```
+--------------------------------------+
|              -------                 |
| Close      Who is using?             |
|--------------------------------------|
| +----------------------------------+ |
| | (A) Anna                    (*)  | |   <- radio, check + bold = selected
| |----------------------------------| |
| | (B) Ben                     ( )  | |
| |----------------------------------| |
| | (C) Cleo                    ( )  | |
| +----------------------------------+ |
|                                      |
| [ Manage members            >  ]     |
+--------------------------------------+
```

- Selecting a member applies immediately, closes the sheet, and the Home/Today content refreshes with a 160 ms cross-fade. Current member is saved (`currentMemberId`).
- **Manage members:** push page inside the sheet: rows with colour swatch + name; tap a row to rename (inline field); swipe left Remove; [ + Add person ] with counter "3 of 8"; at 8 the button is disabled with "Up to 8 people".
- **Remove member (AC-HOME-8):** Dialog: "Remove Ben?" Body: "Ben's open tasks will go to Anyone. Items Ben already completed keep his name." [ Cancel ] [ Remove ] (red). The last remaining member cannot be removed (row has no Remove; hint "You need at least one person"). If the removed member is current, current becomes the first remaining member.
- A member name must be 1-30 characters, unique ignoring case (inline error "Someone already has that name").
- Member colours are auto-assigned in order and are not user-pickable in MVP **(Design decision)**; initials always show so colour is never the only cue.

### 5.7 Goals calculator (AC-GOAL-1 to 9; P1: 10, 11, 12)

**Goals root = saved goals.** The calculator opens from "New goal" or by tapping a goal. A quick unsaved calculation is allowed (Save is optional).

```
+--------------------------------------+
| Goals                           (gear) |
|                                      |
| +----------------------------------+ |
| | New laptop                       | |
| | 1,000 of 5,000          20%      | |   <- P1 progress bar
| | [=====-------------------------] | |
| | 20 months at 200 / month         | |
| |   Ready by Jul 2028              | |
| +----------------------------------+ |
|                                      |
| +----------------------------------+ |
| | Holiday fund                     | |
| | ...                              | |
| +----------------------------------+ |
|                                      |
|                    ( + New goal )    |
|--------------------------------------|
|  Today   Bills   Home   Goals*       |
+--------------------------------------+
```

- Card summary shows the first scenario or the target-date result in text; saved goals list up to 20 (AC-GOAL-9). Swipe left: Delete (Undo 5 s). Tap opens the calculator filled.
- **Empty:** icon target, heading "No goals yet", body "Work out how long it takes to save for something, or how much to put aside each month.", [ Plan your first goal ].

**Calculator screen** (full-height sheet, large detent; header Close / "Goal" / Save)

```
+--------------------------------------+
| Close        Goal           [ Save ] |
|--------------------------------------|
| Goal name (optional)                 |
| [ New laptop                      ]  |
| What you want to save                |
| [ EUR                    5,000.00 ]  |
| Saved so far                         |
| [ EUR                    1,000.00 ]  |
| [ + Add to savings ]  (saved goals)  |
| Interest per year       [ 0 ] %      |
|                                      |
| (  How long  |  By a date  )         |   <- segmented control
|                                      |
| [ Monthly amount          200.00 ]   |
|                                      |
| +--------------+ +----------------+  |
| | 100 / mo   x | | 200 / mo     x |  |
| | 40 months    | | 20 months      |  |
| | 3 yrs 4 mo   | | 1 yr 8 mo      |  |
| | Mar 2030     | | Jul 2028       |  |
| +--------------+ +----------------+  |
| +--------------+ +----------------+  |
| | 250 / mo   x | | 400 / mo     x |  |
| | 16 months    | | 10 months      |  |
| | 1 yr 4 mo    | | 10 months      |  |
| | Mar 2028     | | Sep 2027       |  |
| +--------------+ +----------------+  |
|          [ + Add scenario ]  (<4)    |
|                                      |
| Estimates only. Not financial advice.|
+--------------------------------------+
```

- **Inputs (AC-GOAL-1):** goal name (optional), goal amount (> 0), saved so far (>= 0, default 0), monthly amount (> 0), interest per year (0 to 20, up to 2 decimals, default 0, AC-GOAL-4; shown as a compact row "Interest per year 0 %" that expands the field). Results update live on every valid change, with no Calculate button.
- **Scenarios (AC-GOAL-2):** one entered monthly amount generates 4 cards at 0.5x, 1x, 1.5x, 2x (each rounded to a whole currency unit, minimum 1). Each card's amount is an editable field; cards can be removed (x, minimum 1 left) and added (+ Add scenario while fewer than 4), range 1 to 4. Each card shows monthly amount, months, "x yrs y mo", target month and year.
- **Layout at 375 px (AC-GOAL-8):** a 2 x 2 grid of cards (each at least 160 pt wide); with 1 scenario one full-width card; with 3 the third card spans the full width. No horizontal scrolling is needed. At 130% text size cards stack to one column.
- **Base vs. custom:** editing the "Monthly amount" regenerates 0.5x/1x/1.5x/2x only while no card amount was edited by hand; once the user edits a card, the monthly field becomes the "base" and a text button "Reset scenarios" regenerates them **(Design decision)**.
- **Fastest scenario** is marked with a small "Fastest" pill (text + icon) so the comparison reads at a glance.
- **Money formatting (AC-GOAL-8):** default currency and device locale. Test fixtures AC-GOAL-3/4 render exactly as listed in the PRD.

States (AC-GOAL-5, 7)
| Condition | What the results area shows |
|---|---|
| Goal amount empty or 0 | Nothing: a hint "Enter what you want to save to see results." |
| Saved >= goal | Success card with check icon: "Goal already reached" (green) |
| Monthly empty or 0 | Prompt "Enter a monthly amount" (never "Infinity") |
| Scenario needs > 1,200 months | In that card: "More than 100 years" (months and date rows replaced) |
| Rate outside 0-20 | Inline error under the field: "Enter a rate between 0 and 20" |
| Valid | Scenario cards as drawn |

**Reverse mode: "By a date" (AC-GOAL-6, 7)**

```
| (  How long  |  By a date  )         |
|                                      |
| Reach it by                          |
| [ Sat 21 Nov 2027              > ]   |
|                                      |
| +----------------------------------+ |
| | Put aside each month             | |
| |        333.34                    | |   <- hero number, rounded up
| | for 12 months                    | |
| | You add 4,000.00 in total        | |
| +----------------------------------+ |
|  Rounded up so you reach your goal.  |
```
- Date must be after today and at most 50 years out (the picker is bounded with `min`/`max`). Past or same-day date: inline error "Pick a date after today", no result. More than 50 years: "Pick a date within 50 years".
- Saved >= goal: "Goal already reached". Months are whole months rounded up (PRD section 7); the card states the months used so the figure can be checked.
- The goal inputs and rate are shared between modes (one form, two result views).

**Save / saved goal (AC-GOAL-9)**
- **Save** (header): saves name (default "Goal" if empty), target, current, scenarios, rate and the target date if set; button disabled with 20 goals ("You can keep up to 20 goals").
- **Add to savings:** a small sheet: field "How much did you add?", live preview "New total 1,200.00", [ Add ]; adds to the stored current amount (not replace), Undo toast.
- **Delete goal:** in the sheet menu or swipe; Undo 5 s.
- **Left after bills (P1, AC-GOAL-10):** when income is set in Settings, a chip under the monthly field: "Left after bills: 1,872.51. Use as monthly amount"; hidden without income.
- **Progress (P1, AC-GOAL-11)** on saved goal cards; **Share result (P1, AC-GOAL-12):** button at the bottom opening the iOS share sheet with plain text.
- Footer line on the calculator: "Estimates only. Not financial advice." (PRD non-goal note).

### 5.8 Settings (AC-APP-4, 5, 7, 8, 9, 15, 16, 17)

Full-height sheet opened by the gear; title "Settings", Close top left.

```
+--------------------------------------+
| Close          Settings              |
|--------------------------------------|
| GENERAL                              |
| +----------------------------------+ |
| | Currency                 EUR  >  | |
| | Default reminder      3 days  >  | |
| | Appearance            System  >  | |
| | (P1) Monthly income    Not set > | |
| +----------------------------------+ |
|                                      |
| HOME                                 |
| +----------------------------------+ |
| | Household members            3 > | |
| +----------------------------------+ |
|                                      |
| YOUR DATA                            |
| +----------------------------------+ |
| | Back up                          >| |
| | Import a backup                  >| |
| | Import a shared list             >| |
| | Last backup (P1)        14 Oct   | |
| | (P1) Export bills (CSV)          >| |
| | Storage        Protected on phone | |   <- persist() status
| +----------------------------------+ |
|                                      |
| (P1) NOTIFICATIONS                   |
| | Show count on app icon    (toggle)| |
|                                      |
| HELP                                 |
| | Replay the intro                 >| |
| | How to install                   >| |
|                                      |
| ABOUT                                |
| | Version                      1.0.0 | |
|                                      |
| [ Erase all data ]          (red)    |
+--------------------------------------+
```

- **Currency (AC-APP-5):** pushes a searchable list of ISO 4217 codes with names; current one checked. After choosing, a note appears on the row and in a confirming toast: "Amounts keep their numbers and now show as USD. Nothing is converted." 0-decimal currencies (JPY) store and show whole units.
- **Default reminder:** choice chips 0 / 1 / 3 / 7 days (labels "On the day, 1 day, 3 days, 1 week"); applies to new bills only; existing bills keep their own lead.
- **Appearance:** System / Light / Dark segmented; applies instantly via `data-theme`.
- **Storage (AC-APP-7):** shows "Protected" (persist granted) or "Not guaranteed" with an explanation row: "iPhone may clear data when space is low. Back up regularly." and a [ Back up now ] link when not granted.
- **Badge toggle (P1, AC-APP-15):** the toggle triggers the permission prompt from the tap; if unsupported or denied, it stays off with the explanation "Your iPhone or browser doesn't support icon counts here." / "Allow notifications for Nestwise in iOS Settings to turn this on."
- **Erase all data (AC-APP-4):** red text button at the bottom, opens the Erase sheet (below).

**Back up (AC-APP-8)**
```
| Back up your data                    |
| Saves everything (bills, lists,      |
| goals, settings) in one file. Keep   |
| it somewhere safe like iCloud Drive. |
| [ Create backup file ]               |
```
Tap creates `nestwise-backup-YYYY-MM-DD.json` and opens the iOS share sheet (Save to Files, AirDrop...); fallback is a download. Success toast "Backup saved" and Last backup updates (P1). If the user cancels the share sheet nothing is recorded as a backup.

**Import a backup (AC-APP-9)**
```
| Import a backup                      |
| [ Choose file ]                      |
|  or paste code  [               ]    |
|                                      |
| (after choosing)                     |
| nestwise-backup-2026-11-01.json      |
| 12 bills · 3 members · 2 lists ·     |
| 41 items · 2 goals                   |
|                                      |
| ( ) Replace all data on this phone   |
| ( ) Merge with what's here           |
| [ Import ]                           |
```
Errors (nothing changes): "This file isn't a Nestwise backup." / "This backup is damaged and can't be read." / "This backup is from a newer version of Nestwise. Update the app and try again." Replace all shows a second confirm line "This replaces everything on this phone. Make a backup first if unsure."; Merge resolves per item by newest `updatedAt` (D11).

**Erase all data (AC-APP-4)**
```
| Erase all data                       |
| This deletes every bill, list and    |
| goal on this phone. It can't be      |
| undone. Back up first.               |
| [ Back up first ]                    |
| Type ERASE to confirm                |
| [                                 ]  |
| [ Erase everything ]  (disabled until the text equals ERASE) |
```
After erase the app returns to onboarding (first launch state).

### 5.9 Share a list and import a shared list (AC-HOME-10, 11; P1 AC-HOME-14)

**Share sheet** (from a list's "..." menu; medium detent)
```
+--------------------------------------+
| Close       Share Shopping           |
|--------------------------------------|
| Send a copy of this list to another  |
| phone. They can merge changes back   |
| by sending a copy to you.            |
|                                      |
| [ Send as file ]            (share) |   <- .json via iOS share sheet
| [ Copy code ]                        |
| (P1) [ Share link ]   [ Show QR ]    |
|                                      |
| Share a copy; merge changes back by |
| importing.                           |
+--------------------------------------+
```
- Whole-household export is available from Settings > Back up (full backup) and Merge import; the per-list share is the primary path.
- QR (P1): shows the code when up to 50 items fit; otherwise the message "This list is too big for a QR code. Send it as a file instead." (AC-HOME-14).

**Import preview** (from Settings > Import a shared list, or pasted code detected on the Home tab)
```
+--------------------------------------+
| Cancel      Import a list            |
|--------------------------------------|
| [ Choose file ]  or paste code       |
| [                                 ]  |
|                                      |
| Shopping (from Anna's phone)         |
| +----------------------------------+ |
| |  3 new                           | |
| |  2 updated                       | |
| |  1 deleted                       | |
| +----------------------------------+ |
| Newest change wins for each item.    |
| [ Merge into my list ]               |
+--------------------------------------+
```
- Preview counts use the PRD wording "3 new, 2 updated, 1 deleted" (AC-HOME-11). Importing the same snapshot twice shows "Nothing new. Already up to date." and changes nothing.
- Errors (nothing changes): "That doesn't look like a shared Nestwise list." / "This file is damaged." / "This was made with a newer version of Nestwise. Update the app first."
- **Link landing page (P1, AC-HOME-14):** the link opens in Safari (separate storage, D3), which shows a standalone page: icon, "A shared list from Nestwise", [ Copy code ] and 3 steps ("1. Open Nestwise from your Home Screen. 2. Go to Settings > Import a shared list. 3. Paste the code and tap Merge."). This page is a static route of the same app, not part of the tab UI.

### 5.10 Onboarding (AC-APP-1)

Full-screen, at most 3 pages, "Skip" top right on all pages (44 pt), page dots, one primary button bottom. Shown once, replayable from Settings > Help.

```
Page 1                          Page 2
+------------------------------+ +------------------------------+
|                       Skip   | |                       Skip   |
|        (nest icon 120px)     | |        (phone + lock icon)   |
|                              | |                              |
|     Welcome to Nestwise      | |   Your data stays on         |
|                              | |   this phone                 |
| Bills, chores and savings    | | No account, no cost, works   |
| goals in one calm place.     | | offline. Add Nestwise to     |
|                              | | your Home Screen first, then |
|  o  .  .                     | | enter your things there.     |
| [          Next            ] | |  .  o  .                     |
+------------------------------+ | [          Next            ] |
                                 +------------------------------+
Page 3
+------------------------------+
|                       Skip   |
|    Pick your currency        |
|  Used everywhere. You can    |
|  change it in Settings.      |
|                              |
| [ EUR  Euro              v ] |   <- pre-selected from device locale
|                              |
|  .  .  o                     |
| [        Start using       ] |
+------------------------------+
```
- Page 2 includes the Safari warning only when not standalone: "You're in Safari. Tap Share, then Add to Home Screen. Data entered here won't appear in the installed app." (D3, AC-APP-2).
- Skip jumps to the end and keeps the pre-selected currency (it is committed on Skip too) so the app is never in an unconfigured state.
- Currency picker is a native `<select>` or the searchable list from Settings; label states "Amounts are not converted if you change this later."

### 5.11 Install banner (AC-APP-2)

Shown in a regular Safari tab only (`navigator.standalone === false` on iOS); never in standalone mode.

```
+--------------------------------------+
| +- (share) Install Nestwise ----- x -+ |
| | Use it like an app, even offline:  | |
| | 1. Tap the Share button (^)        | |
| | 2. Choose "Add to Home Screen"     | |
| | 3. Open Nestwise from your Home    | |
| |    Screen                          | |
| | Data you enter here will not show  | |
| | up in the installed app.           | |
| +------------------------------------+ |
```
- Info style (`--color-info-soft`, info icon), pinned at the top below the header on every tab, close button 44 pt. Dismiss hides it for 7 days **(Design decision; PRD only says dismissible)**; it remains reachable via Settings > Help > How to install.
- Includes an illustration of the Safari share glyph (inline SVG) so non-technical users find the button.

### 5.12 Update available (AC-APP-11)

Slim banner at the top: "Update available" with [ Reload ]. It never interrupts: if a sheet with unsaved input is open, the button is disabled and the text reads "Update ready. Finish what you're doing, then reload." so no input is lost. After reload, stored data is migrated by schema version, never wiped.

---

## 6. Key flows

**F1: Add a bill in under 20 seconds (AC-BILL-1, 2, 4)**
Bills tab -> floating "+ Add bill" (1 tap) -> name autofocused, type "Netflix" -> Next on keyboard moves to Amount, type "9,99" -> cadence defaults to Monthly, date defaults to today, reminder defaults to 3 days -> Save (thumb, footer). 2 fields + 2 taps. Result: sheet closes, row appears in sorted position and flashes briefly; toast not needed.

**F2: See what is due (AC-APP-6)**
Open app (last tab restored, Today by default) -> hero total, Due soon bills, my chores. Tap a row for detail; complete a chore with the checkbox.

**F3: Delete with Undo (AC-BILL-7, AC-HOME-12)**
Swipe left -> full swipe or tap Delete -> row collapses, toast "Netflix deleted. Undo" for 5 s -> Undo restores unchanged in the same position.

**F4: Quick-add shopping (AC-HOME-3)**
Home -> Shopping -> tap field -> "Milk" Return -> "Bread" Return -> "Eggs" Return ... keyboard stays up and focus stays in the field; 5 items in under 15 s.

**F5: Assign a chore (AC-HOME-6, 7)**
Chores -> quick-add "Take out bins" -> tap row -> Assigned to: Ben, Due: Tomorrow -> Done. Ben sees it under Mine and on his Today after switching member.

**F6: Switch member (AC-HOME-7)**
Member chip (Today or Home) -> sheet -> tap Ben -> sheet closes, Mine and Today update immediately.

**F7: Send my shopping list to my partner and merge back (AC-HOME-10, 11)**
Shopping "..." -> Share list -> Send as file (AirDrop/Messages) or Copy code -> partner opens installed app -> Settings > Import a shared list -> chooses file or pastes -> sees "3 new, 2 updated, 1 deleted" -> Merge -> repeat the other way to merge back; importing the same snapshot again says "Nothing new".

**F8: How long to my goal (AC-GOAL-1 to 4)**
Goals -> New goal -> type amount 5,000, saved 1,000, monthly 200 -> four scenarios appear live with durations and dates -> optionally edit a card to 250 -> Save goal.

**F9: How much per month by a date (AC-GOAL-6)**
Goal form -> segmented "By a date" -> pick a date -> required monthly shows in the hero card; change date and it updates.

**F10: Back up and restore (AC-APP-8, 9)**
Settings -> Back up -> Create backup file -> share sheet -> Save to Files. Restore: Settings -> Import a backup -> choose file -> counts shown -> Replace all / Merge -> Import -> toast "Backup restored".

**F11: First launch and install (AC-APP-1, 2, 12)**
Open in Safari -> install banner + onboarding pages -> user adds to Home Screen -> opens installed app (fresh storage, onboarding shows once there) -> currency confirmed -> Today empty state. The banner and onboarding page 2 explain that Safari data will not appear in the installed app, and point to Settings > Back up then Import to bring it over (D3).

**F12: Erase (AC-APP-4)**
Settings -> Erase all data -> sheet -> type ERASE -> button enables -> Erase everything -> returns to onboarding.

---

## 7. Microcopy

Voice rules: plain words, active voice, sentence case everywhere (no Title Case, no ALL CAPS except section labels styled by CSS). Buttons start with a verb. Never "Oops", "Error:", "Invalid", "Please". Use "phone" not "device". Use "Anyone" not "Unassigned".

| Where | Copy |
|---|---|
| Tab labels | Today, Bills, Home, Goals |
| Today total | "You pay about 127.49 a month" / "1,529.88 a year" |
| Today empty | "Nothing due soon" + "Your next bill is Netflix on Tuesday 24 November." |
| Today empty, no bills | "No bills yet. Add one to see it here." |
| Bills empty | "No bills yet" / "Add subscriptions and bills to see what you pay each month." / [ Add your first bill ] |
| Due text | "Today", "Tomorrow", "In 3 days", "In 3 months" |
| Overdue | "1 day overdue", "2 days overdue" |
| Add bill | Title "New bill"; Save "Save bill"; hint "Add a name to save" / "Enter an amount to save" |
| Amount error | "Enter an amount above 0" |
| Name error | "Add a name" |
| Delete toast | "Netflix deleted" + [ Undo ] |
| Pause toast | "Netflix paused" + [ Undo ] |
| Paused detail | "Paused. Not counted in your total or reminders." |
| Cadences | Weekly, Every 2 weeks, Monthly, Quarterly, Yearly (labels "/ week", "/ 2 weeks", "/ month", "/ quarter", "/ year") |
| Reminder lead | On the day, 1 day before, 3 days before, 1 week before |
| Home setup | "Set up your household" / "Share chores and shopping with the people you live with." |
| Members | "Who is using?" / "Up to 8 people" / "You need at least one person" |
| Remove member | "Remove Ben?" / "Ben's open tasks will go to Anyone. Items Ben already completed keep his name." |
| Quick add | placeholder "Add a chore..." / "Add an item..." |
| Empty chores | "Nothing to do" / "Add the first chore below." |
| Mine empty | "Nothing for you. Enjoy the quiet." |
| Done | "Done (2)", "Clear done", toast "3 items cleared" + Undo |
| Share | "Send a copy to another phone. They can merge changes back by sending a copy to you." / "Share a copy; merge changes back by importing." |
| Import preview | "3 new, 2 updated, 1 deleted" / "Newest change wins for each item." / "Nothing new. Already up to date." |
| Import errors | "That doesn't look like a Nestwise file." / "This file is damaged. Nothing was changed." / "This was made with a newer version of Nestwise. Update the app first. Nothing was changed." |
| Goals empty | "No goals yet" / "Work out how long it takes to save for something, or how much to put aside each month." |
| Goal results | "40 months", "3 yrs 4 mo", "Mar 2030", "Goal already reached", "More than 100 years", "Enter a monthly amount", "Enter what you want to save to see results." |
| Reverse | "Put aside each month" / "Rounded up so you reach your goal." / error "Pick a date after today" |
| Disclaimer | "Estimates only. Not financial advice." |
| Currency change | "Amounts keep their numbers and now show as USD. Nothing is converted." |
| Storage | "Protected" / "Not guaranteed. iPhone may clear data when space is low. Back up regularly." |
| Backup nudge | "Back up your data" / "Last backup was 41 days ago." / [ Back up now ] |
| Erase | "This deletes every bill, list and goal on this phone. It can't be undone." / "Type ERASE to confirm" |
| Install banner | "Install Nestwise" / "Tap Share, then Add to Home Screen." / "Data you enter here will not show up in the installed app." |
| Update | "Update available" / [ Reload ] |
| Offline | no message needed, the app never says "offline" because everything works; only a share/QR failure says what to try |
| Onboarding | "Welcome to Nestwise" / "Bills, chores and savings goals in one calm place." / "Your data stays on this phone" / "Pick your currency" |

Dates: "Tue 24 Nov" in lists, "Tuesday 24 November" in sentences and headers, "Mar 2030" for goal targets. Months: "40 months", "1 month". Years: "3 yrs 4 mo", "1 yr", "2 yrs 1 mo".

---

## 8. Screen to AC map

| Screen / component | P0 ACs | P1 / P2 ACs |
|---|---|---|
| 3 App shell, tab bar, safe areas, last tab | AC-APP-3, AC-APP-12 (theme colour, icons), AC-APP-13 | |
| 5.1 Today | AC-APP-6, AC-BILL-9, AC-BILL-5, AC-BILL-6, AC-HOME-9, AC-HOME-7 | AC-APP-16 (backup card), AC-HOME-15 (badge count) |
| 5.2 Bills list | AC-BILL-3, AC-BILL-5, AC-BILL-6, AC-BILL-8, AC-BILL-9, AC-BILL-10, AC-BILL-7 | AC-BILL-13 (search), AC-BILL-14 (category on row), AC-BILL-15 (Ended group) |
| 5.3 Bill add/edit sheet | AC-BILL-1, AC-BILL-2, AC-BILL-4 (next-payment helper), AC-BILL-7, AC-BILL-8 | AC-BILL-14, AC-BILL-15 |
| 5.4 Bill detail | AC-BILL-3, AC-BILL-4, AC-BILL-7, AC-BILL-8, AC-APP-6 | AC-BILL-11, AC-BILL-12 (calendar), AC-BILL-14 (note), AC-BILL-16 (P2, not designed) |
| 5.5 Home overview, setup | AC-HOME-1, AC-HOME-2, AC-HOME-12 | |
| 5.5 Chores list and item sheet | AC-HOME-3, AC-HOME-4, AC-HOME-6, AC-HOME-7, AC-HOME-8, AC-HOME-9, AC-HOME-12 | AC-HOME-13 (recurrence) |
| 5.5 Shopping list | AC-HOME-3, AC-HOME-4, AC-HOME-5, AC-HOME-12 | |
| 5.6 Member switcher / members | AC-HOME-1, AC-HOME-7, AC-HOME-8 | |
| 5.7 Goals list | AC-GOAL-9 | AC-GOAL-11 (progress) |
| 5.7 Calculator, scenarios, results | AC-GOAL-1, AC-GOAL-2, AC-GOAL-3, AC-GOAL-4, AC-GOAL-5, AC-GOAL-8 | AC-GOAL-10 (left after bills), AC-GOAL-12 (share result) |
| 5.7 Reverse mode | AC-GOAL-6, AC-GOAL-7 | |
| 5.7 Save / Add to savings | AC-GOAL-9 | |
| 5.8 Settings | AC-APP-4, AC-APP-5, AC-APP-7, AC-APP-8, AC-APP-9 | AC-APP-15, AC-APP-16, AC-APP-17, AC-GOAL-10 (income) |
| 5.8 Back up / Import / Erase | AC-APP-8, AC-APP-9, AC-APP-4 | |
| 5.9 Share list / import preview | AC-HOME-10, AC-HOME-11 | AC-HOME-14 (link, QR, landing page) |
| 5.10 Onboarding | AC-APP-1, AC-APP-5 | |
| 5.11 Install banner | AC-APP-2 | |
| 5.12 Update banner | AC-APP-11 | |
| Toast / Undo | AC-BILL-7, AC-HOME-5, AC-HOME-12, AC-GOAL-9 | |
| Performance / a11y / offline (cross-cutting) | AC-APP-10, AC-APP-13, AC-APP-14 | |
| Not designed (post-MVP) | | AC-BILL-16, AC-HOME-16, AC-GOAL-13, AC-APP-18 |

Coverage check: every P0 AC in the PRD (AC-BILL-1 to 10, AC-HOME-1 to 12, AC-GOAL-1 to 9, AC-APP-1 to 14) appears at least once above; AC-APP-10 and AC-APP-14 are behavioural and covered through the loading-free state design and performance notes in section 9.

---

## 9. Handoff notes

**Files**
- `src/styles/tokens.css` is the only styling source of truth for colour, type, space, radius, shadow, motion. Do not hardcode hex values in components.
- `public/icons/`: `icon.svg` / `favicon.svg` (rounded, for browsers), `favicon.ico` and `favicon-32.png`, `apple-touch-icon.png` (180, opaque full square; iOS applies its own mask), `icon-192.png`, `icon-512.png` (rounded corners, transparent), `icon-maskable-512.png` (full bleed, artwork inside the 80% safe zone). The generator is `design/generate-icons.mjs` (needs `sharp`, installed outside the project; see the header comment).

**Suggested `<head>` and manifest values (AC-APP-12)**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fbf6ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#181310" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Nestwise">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/favicon.ico" sizes="48x48">
```
Manifest: `"name": "Nestwise"`, `"display": "standalone"`, `"background_color": "#fbf6ef"` (splash-safe), `"theme_color": "#fbf6ef"`, icons: 192 and 512 with `"purpose": "any"`, plus `icon-maskable-512.png` with `"purpose": "maskable"`. Use `status-bar-style: default` so the status bar is dark text on the cream header; in forced dark mode the status bar follows the system, which is acceptable.

**Implementation notes**
- Dark mode: set `document.documentElement.dataset.theme` to `light` or `dark` for forced choices; remove it for System.
- Keyboard and sticky bars: iOS standalone does not resize layout for the keyboard. Size the app root with `visualViewport.height` (update on `resize`/`scroll`), keep quick-add and sheet footers at the bottom of that box, and hide the tab bar while an input is focused.
- Safe areas require `viewport-fit=cover`. Use `100dvh`, not `100vh`.
- Use `overscroll-behavior: none` on the app root and `-webkit-overflow-scrolling: touch` for scroll panes; disable text selection and the tap highlight on rows and buttons; allow selection in inputs.
- Inputs: `font-size` of at least 16 px (`--text-body` is 17 px); `inputmode="decimal"` for money; `enterkeyhint="done"/"next"` as appropriate; `autocapitalize="sentences"` on names.
- Swipe rows: use pointer events with `touch-action: pan-y` on the row so vertical scrolling is native; update transforms in `requestAnimationFrame`.
- 375 x 667 (SE) checks: header + total card + at least two rows visible; sheets still show the primary footer above the keyboard (the form scrolls, the footer does not); calculator cards remain 2 x 2 without horizontal scroll (AC-GOAL-8).
- Loading-free: no spinners. Read localStorage before first paint of a tab if possible; if it takes longer than 150 ms show the tab's skeleton as plain empty surface (no shimmer) to meet AC-APP-14.

**Open questions for product (not invented, defaulted as marked above)**
1. Install banner and backup nudge dismissal duration (design assumes 7 days).
2. Settings as a modal sheet (design) vs. a pushed screen; same content either way.
3. Member colours are auto-assigned only in MVP; a colour picker would be a small P1 addition.
4. The Today bills group shows only Due soon bills; confirm that "next upcoming bill" in the empty state (AC-APP-6) should also show paused-excluded only (design excludes paused bills).
5. Goal scenario regeneration rule (base amount vs. manual edits, section 5.7) is a design decision awaiting confirmation.
