# Test IDs

Stable `data-testid` hooks for Playwright and component tests. Rules: kebab-case, `<area>-<thing>[-<id>]`; `<id>` is the entity id (UUID). Never rename an id without updating this file. Every interactive element and key value has one. Values that are money carry `data-minor="<integer minor units>"` as well, so tests can assert exact amounts without parsing locale formatting (e.g. `monthly-total` has `data-minor="12749"`).

Row ids are on the `<li>`; clicking its centre hits the row button. Only one tab is mounted at a time, so ids repeated across tabs never collide on one screen. Where one entity appears twice on a screen (Due soon plus All bills) the Due soon copy has its own prefix.

## App shell and navigation
| id | what |
|---|---|
| `tab-today`, `tab-bills`, `tab-home`, `tab-goals` | tab bar items (`role=tab`, `aria-selected`) |
| `tab-<tab>-dot` | amber due-soon dot on a tab |
| `screen-today`, `screen-bills`, `screen-home`, `screen-goals` | screen roots |
| `screen-title`, `screen-subtitle` | large title and subtitle (Today: the long date) |
| `settings-button` | header gear, opens Settings |
| `toast`, `toast-message`, `toast-action` | toast, its text and the Undo button |
| `install-banner`, `install-banner-dismiss`, `install-steps` | iOS Safari install banner |
| `update-banner`, `update-reload-button`, `update-wait-text` | "Update available" banner (`update-wait-text` shows while a form has unsaved input; Reload is then disabled) |
| `storage-banner`, `storage-banner-backup`, `storage-banner-dismiss` | storage unavailable / save failed banner |
| `discard-dialog`, `discard-dialog-cancel`, `discard-dialog-confirm` | "Discard changes?" |

## Sheets (pattern)
Every sheet has `<sheet>` (the dialog), `<sheet>-title`, `<sheet>-close` (Cancel / Close / Back), `<sheet>-scrim`. Sheets: `bill-sheet`, `bill-detail`, `settings-sheet`, `item-sheet`, `members-sheet`, `list-sheet`, `list-menu`, `share-sheet`, `goal-sheet`. Confirm dialogs: `<dialog>`, `<dialog>-cancel`, `<dialog>-confirm` (the title has no id; assert on the dialog text).

## Onboarding and fatal screens
`onboarding`, `onboarding-page-1|2|3`, `onboarding-skip`, `onboarding-next`, `onboarding-start`, `onboarding-currency-select` (native select, value = ISO code), `onboarding-safari-warning`.
`corrupt-screen`, `corrupt-import-button`, `corrupt-save-copy-button`, `corrupt-fresh-button`, `fresh-dialog(-cancel|-confirm)`. `newer-screen`, `newer-reload-button`.

## Today
| id | what |
|---|---|
| `today-total-card` | tappable total card (opens Bills) |
| `today-monthly-total`, `today-yearly-total` | hero totals (`data-minor`) |
| `today-due-soon` | Due soon group |
| `today-bill-<billId>` | due soon bill row |
| `today-chores`, `today-chore-<itemId>`, `today-chore-check-<itemId>` | chores group, row (opens `item-sheet`), checkbox |
| `member-chip`, `member-chip-name` | current member in the Today bar (opens the switcher); same ids on the Home root row. Hidden until a household exists |
| `today-empty` | "Nothing due soon" empty state |
| `today-add-bill` | "Add a bill" in the no-bills empty state |
| `backup-nudge`, `backup-nudge-text`, `backup-nudge-action`, `backup-nudge-dismiss` | backup card |

## Bills
| id | what |
|---|---|
| `monthly-total`, `yearly-total`, `total-card` | Bills totals (`data-minor`) |
| `rounding-note` | rounding footnote |
| `bill-add-button` | floating "Add bill" (or "Add your first bill" in the empty state; never both) |
| `bills-empty`, `bills-all-paused`, `bills-no-match` | empty / all paused / no search match |
| `bill-search` | search field |
| `bills-due-soon`, `bills-all`, `bills-paused`, `bills-ended` | groups; `bills-paused-toggle` collapses Paused |
| `due-soon-row-<billId>` | row in Due soon |
| `bill-row-<billId>` | row in All bills / Paused / Ended |
| `bill-delete-<billId>`, `bill-pause-<billId>`, `bill-resume-<billId>` | swipe actions on a `bill-row` (`due-soon-delete-<billId>` etc. for Due soon rows). Only reachable after swipe-left or ArrowLeft on the row button |

## Bill add / edit sheet
`bill-name-input`, `bill-amount-input` (`-error`, `-hint` = live "= 12.50 / month"), `bill-cadence` + `bill-cadence-weekly|biweekly|monthly|quarterly|yearly`, `bill-date-input` (`-hint` = "Next payment: ..."), `bill-lead` + `bill-lead-0|1|3|7`, `bill-more-toggle`, `bill-category` + `bill-category-subscriptions|utilities|rent-mortgage|insurance|other`, `bill-note-input`, `bill-end-input`, `bill-save-hint`, `bill-save-button` (disabled until valid), and in edit mode `bill-pause-button` / `bill-resume-button`, `bill-delete-button`. Field errors: `<field>-error` (e.g. `bill-name-input-error`).

## Bill detail sheet
`bill-detail-name`, `bill-detail-category`, `bill-detail-amount`, `bill-detail-yearly`, `bill-detail-paused`, `bill-detail-ended`, `bill-detail-next`, `bill-detail-then`, `bill-detail-lead`, `bill-detail-since`, `bill-detail-note`, `bill-edit-button`, `bill-pause-button`, `bill-resume-button`, `bill-delete-button`.

## Settings
`settings-root`, group ids `settings-general|data|notifications|help|about`.
`settings-currency-row` (`-value`), `settings-lead` + `settings-lead-0|1|3|7`, `settings-appearance` + `settings-appearance-system|light|dark`, `settings-backup-row`, `settings-import-row`, `settings-last-backup` (`-value`), `settings-storage` (`-value`: "Protected" or "Not guaranteed"), `settings-storage-note`, `settings-storage-backup`, `settings-badge-row`, `settings-badge-toggle`, `settings-badge-note`, `settings-replay-intro`, `settings-install-row`, `settings-version` (`-value`), `settings-erase-button`.
Currency page: `currency-note`, `currency-search`, `currency-list`, `currency-option-<ISO>`.
Backup page: `backup-page`, `backup-create-button`.
Import page: `import-page`, `import-file-input` (use `setInputFiles`), `import-paste-input`, `import-error`, `import-preview`, `import-filename`, `import-counts` ("1 bills · 0 members · ..."), `import-mode-replace`, `import-mode-merge`, `import-replace-warning`, `import-confirm-button`.
Erase page: `erase-page`, `erase-backup-button`, `erase-input`, `erase-confirm-button` (disabled until the input equals `ERASE`).
Install help page: `install-page`, `install-steps`.

## Home
Rows have the id on the `<li>`; click `.row__main` inside it (swipe actions only after swipe-left or ArrowLeft on the row button).
| id | what |
|---|---|
| `household-setup`, `household-name-input`, `member-name-input-<n>` (n from 0; `-error`), `add-person-button`, `household-start-button` | first-use setup (AC-HOME-1); Start disabled until a name and one person |
| `home-who`, `home-lists` | Home root groups; the row inside `home-who` is `member-chip` |
| `list-row-<listId>`, `list-count-<listId>` ("3 open" / "2 items"), `list-overdue-<listId>`, `list-due-soon-<listId>` | list rows and their counts / pills |
| `list-rename-<listId>`, `list-delete-<listId>` | swipe actions on a list row |
| `list-add-button` | "New list" (disabled with "List limit reached (20)" at 20) |
| `home-import-button` | "Import a shared list" (opens Settings on that page) |
| `screen-list`, `back-button`, `list-menu-button` | list screen, back to Home, the "..." button |
| `list-filter`, `filter-all`, `filter-mine` | All / Mine chips on chore lists (`role=radio`, `aria-checked`) |
| `list-open`, `list-done` (`list-done-toggle`) | open items group, collapsed Done group |
| `list-empty`, `list-mine-empty`, `list-show-all`, `list-all-done` | empty states |
| `item-<itemId>` | item row (`<li>`) |
| `item-check-<itemId>` | checkbox (`role=checkbox`, `aria-checked`) |
| `item-assignee-<itemId>` | assignee avatar; `data-assignee` = member id or `anyone` |
| `item-qty-<itemId>` | shopping quantity text |
| `item-edit-<itemId>`, `item-delete-<itemId>` | swipe actions |
| `quick-add-input`, `quick-add-button` | quick add field and its + button |
| `clear-done-button` | "Clear done" on shopping lists |
| `toast`, `toast-message`, `toast-action` | Undo toasts: "<title> done" / "Done. Next one: <date>", "<title> deleted", "3 items cleared", "<list> deleted" |

## Item sheet (`item-sheet`)
`item-title-input`, `item-qty-input` (shopping), `item-assign` + `item-assign-anyone|<memberId>` (chores), `item-due` + `item-due-none|today|tomorrow|pick`, `item-due-input` (date, shown after Pick a date; `-error`), `item-repeat` + `item-repeat-none|daily|weekly|biweekly|monthly`, `item-done-stamp`, `item-save-hint`, `item-save-button` ("Done"), `item-delete-button`. Cancel (`item-sheet-close`) asks "Discard changes?" when dirty.

## Members (`members-sheet`)
| id | what |
|---|---|
| `member-options` (radiogroup), `member-option-<memberId>` | "Who is using?" (`role=radio`, `aria-checked`); choosing one closes the sheet |
| `manage-members-button` | pushes the manage page |
| `members-manage`, `member-row-<memberId>` | manage page, a row |
| `member-edit-<memberId>` | name button; opens the inline rename: `member-rename-input-<memberId>` (`-error`), `member-rename-save-<memberId>`, `member-rename-cancel-<memberId>` |
| `member-remove-<memberId>` | remove (absent for the last person); dialog `remove-member-dialog` |
| `member-add-input` (`-error`, `-hint` "Up to 8 people"), `member-add-button`, `member-count` ("3 of 8"), `members-min-hint` | add a person |
| `members-no-household`, `members-setup-button` | shown when opened before Home is set up |

## List sheets
`list-name-input` (`-error`), `list-type` + `list-type-chore|shopping` (new list only), `list-type-fixed` (rename), `list-save-button`. Menu (`list-menu`): `list-menu-rename`, `list-menu-share`, `list-menu-clear-done` (shopping, disabled with no done items), `list-menu-delete`.

## Share and import a list
| id | what |
|---|---|
| `share-file-button` | "Send as file" (iOS share sheet, download fallback; toast "File saved") |
| `share-copy-code-button`, `share-code-output` (read-only textarea holding the `NW1.` code), `share-copy-manual` | copy code and the manual-copy fallback |
| `share-link-button`, `share-qr-button` | P1: link (compact `NW2.` code in the URL fragment) and QR; shown once the compact code is ready |
| `share-qr`, `share-qr-svg` (`data-modules`), `share-qr-toobig` | QR panel or the "too big" message |
| `settings-import-list-row` | Settings > Import a shared list |
| `import-list-page`, `import-list-file-input` (`setInputFiles`), `import-list-paste-input` | the import page (accepts a code, a link, a message containing one, or a `.json` file) |
| `import-list-error` | error text (nothing changed) |
| `import-list-preview`, `import-list-name`, `import-list-filename`, `import-list-counts` ("3 new, 2 updated, 1 deleted"), `import-list-uptodate` ("Nothing new. Already up to date."), `import-list-members` | preview |
| `import-list-confirm` | "Merge into my list" (disabled when up to date); then opens the list and toasts "Merged: ..." |
| `import-list-no-household`, `import-list-setup-button` | shown before Home is set up |
| `shared-landing`, `shared-landing-summary`, `shared-landing-copy`, `shared-landing-copied`, `shared-landing-steps`, `shared-landing-error` | landing page for `#/shared/<code>` links (outside the tab UI, before onboarding) |
| `settings-members-row` (`-value` = count) | Settings > Household members |

## Goals
| id | what |
|---|---|
| `goals-empty`, `goal-add-button` | empty state / floating "New goal" (the same id is on whichever add button is shown) |
| `goals-list`, `goal-row-<goalId>` | saved goals |
| `goal-progress-<goalId>` (`role=progressbar`, `aria-valuenow`), `goal-progress-pct-<goalId>`, `goal-progress-text-<goalId>`, `goal-summary-<goalId>` | card progress and one-line result |
| `goal-delete-<goalId>` | swipe action |

Calculator (`goal-sheet`): `goal-save-button` (header, disabled until valid), `goal-save-hint`, `goal-name-input`, `goal-target-input`, `goal-saved-input`, `goal-rate-input` (each with `-error`), `goal-mode` + `goal-mode-how-long|by-date`, `goal-monthly-input`, `goal-reset-scenarios` (only after a card was edited), `goal-date-input` (`-error`; `min`/`max` set), `goal-results`, `goal-disclaimer`, `goal-share-button`, `goal-delete-button`, `goal-left-after-bills` (`-amount` with `data-minor`), `goal-use-left`.
Results: `goal-hint`, `goal-monthly-prompt`, `goal-date-prompt`, `goal-reached`, `goal-covered`. Scenarios: `goal-scenarios`, `goal-scenario-<i>` (i from 0), `goal-scenario-input-<i>`, `goal-scenario-remove-<i>`, `goal-scenario-months-<i>` (`data-months`), `goal-scenario-duration-<i>`, `goal-scenario-date-<i>`, `goal-scenario-fastest-<i>`, `goal-scenario-toolong-<i>`, `goal-scenario-error-<i>`, `goal-add-scenario`. Reverse mode: `goal-required`, `goal-required-amount` (`data-minor`), `goal-required-months` (`data-months`), `goal-required-total`, `goal-required-note`.
Add to savings: `goal-add-savings-toggle`, `goal-add-savings`, `goal-add-savings-input`, `goal-add-savings-preview` (`data-minor` = new total), `goal-add-savings-button`.

## Settings additions
`settings-home` group, `settings-members-row`, `settings-import-list-row`, `settings-income-row` (`-value`), income page: `income-page`, `income-input` (`-error`), `income-save-button`.
