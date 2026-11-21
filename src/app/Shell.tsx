import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { dueSoonBills } from '../lib/bills.ts';
import { dueSoonChores, resolveCurrentMemberId } from '../lib/household.ts';
import { TabBar } from '../components/TabBar.tsx';
import { GoalsScreen } from '../screens/goals/GoalsScreen.tsx';
import { HomeScreen } from '../screens/home/HomeScreen.tsx';
import { BillsScreen } from '../screens/bills/BillsScreen.tsx';
import { TodayScreen } from '../screens/today/TodayScreen.tsx';
import { InstallBanner, StorageBanner, UpdateBanner } from './Banners.tsx';
import { updateBadge } from './badge.ts';
import { OverlayHost } from './OverlayHost.tsx';
import { isTabId, loadPrefs, savePrefs, type TabId } from './prefs.ts';
import { useAppData, useToday } from './StoreProvider.tsx';

interface ShellProps {
  updateReady: boolean;
  onReload: () => void;
}

/**
 * The app frame: banners, the routed tab content, the tab bar and the overlay host.
 * Add a tab screen by adding a route here and an entry in components/TabBar.tsx (TABS) and prefs.ts (TAB_IDS).
 */
export function Shell({ updateReady, onReload }: ShellProps) {
  const data = useAppData();
  const today = useToday();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = pathname.split('/')[1] ?? '';

  // Last open tab is restored on launch (AC-APP-3).
  useEffect(() => {
    if (isTabId(tab)) savePrefs({ lastTab: tab });
  }, [tab]);

  const memberId = resolveCurrentMemberId(data.members, data.settings.currentMemberId);
  const counts = useMemo(() => {
    const bills = dueSoonBills(data.bills, today).length;
    const chores = dueSoonChores(data.items, data.lists, memberId, today).length;
    return { bills, chores };
  }, [data.bills, data.items, data.lists, memberId, today]);

  // App icon badge, best effort (AC-APP-15): bills due soon plus the current member's chores.
  const badgeCount = counts.bills + counts.chores;
  useEffect(() => {
    void updateBadge(data.settings.badgeEnabled ? badgeCount : 0);
  }, [data.settings.badgeEnabled, badgeCount]);

  const dueSoon: Partial<Record<TabId, number>> = { today: badgeCount, bills: counts.bills };

  // Re-tapping the active tab scrolls to top and, inside Home, pops to the lists overview (DESIGN 3.1).
  const onReselect = (reselected: TabId) => {
    if (reselected === 'home' && pathname !== '/home') navigate('/home');
    else document.querySelector('[data-scroll-root]')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div id="app-shell" className="app">
        <div className="banners">
          <StorageBanner />
          <InstallBanner />
          <UpdateBanner ready={updateReady} onReload={onReload} />
        </div>
        <main className="app__main">
          <div className="tab-fade" key={tab}>
            <Routes>
              <Route path="/today" element={<TodayScreen />} />
              <Route path="/bills" element={<BillsScreen />} />
              <Route path="/home/*" element={<HomeScreen />} />
              <Route path="/goals/*" element={<GoalsScreen />} />
              <Route path="*" element={<Navigate to={`/${loadPrefs().lastTab}`} replace />} />
            </Routes>
          </div>
        </main>
        <TabBar dueSoon={dueSoon} onActiveReselect={onReselect} />
      </div>
      <OverlayHost />
    </>
  );
}
