import { useState } from 'react';
import type { Appearance, LeadDays } from '../../types.ts';
import { LEAD_OPTIONS, formatDateWithYear, leadChipLabel } from '../../lib/format.ts';
import { liveMembers } from '../../lib/household.ts';
import { formatMoney } from '../../lib/money.ts';
import { deviceLocale } from '../../app/locale.ts';
import { badgeSupported, requestBadgePermission } from '../../app/badge.ts';
import { useAppData, useAppState, useStore } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Button } from '../../components/Button.tsx';
import { ChoiceChips, type ChipOption } from '../../components/Chips.tsx';
import { Group } from '../../components/Group.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { Toggle } from '../../components/Toggle.tsx';
import { BackupPage } from './BackupPage.tsx';
import { CurrencyPage } from './CurrencyPage.tsx';
import { ErasePage } from './ErasePage.tsx';
import { IncomePage } from './IncomePage.tsx';
import { ImportListPanel } from './ImportListPanel.tsx';
import { ImportPage } from './ImportPage.tsx';
import { InstallPage } from './InstallPage.tsx';
import { SettingsRow } from './SettingsRow.tsx';

type Page = 'root' | 'currency' | 'backup' | 'import' | 'import-list' | 'income' | 'erase' | 'install';

const PAGE_TITLE: Record<Page, string> = {
  root: 'Settings',
  currency: 'Currency',
  backup: 'Back up',
  import: 'Import a backup',
  'import-list': 'Import a list',
  income: 'Monthly income',
  erase: 'Erase all data',
  install: 'How to install',
};

const LEAD_CHIPS: ChipOption<LeadDays>[] = LEAD_OPTIONS.map((l) => ({ value: l, label: leadChipLabel(l), testId: `settings-lead-${l}` }));
const APPEARANCE: ChipOption<Appearance>[] = [
  { value: 'system', label: 'System', testId: 'settings-appearance-system' },
  { value: 'light', label: 'Light', testId: 'settings-appearance-light' },
  { value: 'dark', label: 'Dark', testId: 'settings-appearance-dark' },
];

/** Settings (DESIGN 5.8) as a full-height sheet with pushed pages (currency list, backup, import, erase, install help). */
export function SettingsSheet({ initialPage }: { initialPage?: Page }) {
  const store = useStore();
  const { settings, members } = useAppData();
  const persist = useAppState((s) => s.persist);
  const storageAvailable = useAppState((s) => s.storageAvailable);
  const { close, open } = useOverlays();
  const [page, setPage] = useState<Page>(initialPage ?? 'root');
  const [badgeMessage, setBadgeMessage] = useState<string | null>(null);
  const back = () => setPage('root');
  const set = (patch: Partial<typeof settings>) => store.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const toggleBadge = async (on: boolean) => {
    if (!on) {
      set({ badgeEnabled: false });
      setBadgeMessage(null);
      return;
    }
    const result = await requestBadgePermission();
    if (result === 'granted') {
      set({ badgeEnabled: true });
      setBadgeMessage(null);
    } else {
      setBadgeMessage(result === 'denied' ? 'Allow notifications for Nestwise in iOS Settings to turn this on.' : "Your iPhone or browser doesn't support icon counts here.");
    }
  };

  const protectedStorage = storageAvailable && persist === 'granted';
  const locale = deviceLocale();

  return (
    <Sheet title={PAGE_TITLE[page]} closeLabel={page === 'root' ? 'Close' : 'Back'} onClose={page === 'root' ? close : back} testId="settings-sheet">
      {page === 'root' && (
        <div className="form" data-testid="settings-root">
          <Group title="General" testId="settings-general">
            <SettingsRow label="Currency" value={settings.currency} onPress={() => setPage('currency')} testId="settings-currency-row" />
            <li className="srow srow--block">
              <ChoiceChips label="Default reminder" options={LEAD_CHIPS} value={settings.defaultLeadDays} onChange={(defaultLeadDays) => set({ defaultLeadDays })} testId="settings-lead" />
              <p className="t-footnote">Applies to new bills only.</p>
            </li>
            <li className="srow srow--block">
              <span className="field__label">Appearance</span>
              <Segmented label="Appearance" options={APPEARANCE} value={settings.appearance} onChange={(appearance) => set({ appearance })} testId="settings-appearance" />
            </li>
            <SettingsRow label="Monthly income" value={settings.monthlyIncomeMinor === undefined ? 'Not set' : formatMoney(settings.monthlyIncomeMinor, settings.currency, locale)} onPress={() => setPage('income')} testId="settings-income-row" />
          </Group>

          <Group title="Home" testId="settings-home">
            <SettingsRow label="Household members" value={liveMembers(members).length} onPress={() => open({ kind: 'members', page: 'manage' })} testId="settings-members-row" />
          </Group>

          <Group title="Your data" testId="settings-data">
            <SettingsRow label="Back up" onPress={() => setPage('backup')} testId="settings-backup-row" />
            <SettingsRow label="Import a backup" onPress={() => setPage('import')} testId="settings-import-row" />
            <SettingsRow label="Import a shared list" onPress={() => setPage('import-list')} testId="settings-import-list-row" />
            <SettingsRow label="Last backup" value={settings.lastBackupAt ? formatDateWithYear(settings.lastBackupAt.slice(0, 10), locale) : 'Never'} testId="settings-last-backup" />
            <SettingsRow label="Storage" value={protectedStorage ? 'Protected' : 'Not guaranteed'} testId="settings-storage" />
          </Group>
          {!protectedStorage && (
            <p className="note t-footnote" data-testid="settings-storage-note">
              {storageAvailable ? 'iPhone may clear data when space is low. Back up regularly.' : 'This browser is blocking storage, so nothing is saved after you close the app. Back up before you leave.'}{' '}
              <button type="button" className="link" onClick={() => setPage('backup')} data-testid="settings-storage-backup">Back up now</button>
            </p>
          )}

          <Group title="Notifications" testId="settings-notifications">
            <SettingsRow
              label="Show count on app icon"
              testId="settings-badge-row"
              control={<Toggle checked={settings.badgeEnabled && badgeSupported()} onChange={(on) => void toggleBadge(on)} label="Show count on app icon" testId="settings-badge-toggle" disabled={!badgeSupported()} />}
            />
          </Group>
          <p className="note t-footnote" data-testid="settings-badge-note">
            {badgeMessage ?? (badgeSupported() ? 'Counts bills due soon. It can be out of date until you open the app.' : "Your iPhone or browser doesn't support icon counts here.")}
          </p>

          <Group title="Help" testId="settings-help">
            <SettingsRow
              label="Replay the intro"
              onPress={() => {
                set({ onboardingDone: false });
                close();
              }}
              testId="settings-replay-intro"
            />
            <SettingsRow label="How to install" onPress={() => setPage('install')} testId="settings-install-row" />
          </Group>

          <Group title="About" testId="settings-about">
            <SettingsRow label="Version" value={__APP_VERSION__} testId="settings-version" />
          </Group>

          <Button variant="text" className="btn--danger-text" block onClick={() => setPage('erase')} data-testid="settings-erase-button">Erase all data</Button>
        </div>
      )}
      {page === 'currency' && <CurrencyPage onDone={back} />}
      {page === 'income' && <IncomePage onDone={back} />}
      {page === 'backup' && <BackupPage />}
      {page === 'import' && <ImportPage onDone={close} />}
      {page === 'import-list' && <ImportListPanel />}
      {page === 'erase' && <ErasePage onBackup={() => setPage('backup')} onDone={close} />}
      {page === 'install' && <InstallPage />}
    </Sheet>
  );
}
