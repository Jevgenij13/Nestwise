import { Link, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon.tsx';
import type { TabId } from '../app/prefs.ts';

export interface TabDef {
  id: TabId;
  label: string;
  icon: IconName;
}

export const TABS: readonly TabDef[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'bills', label: 'Bills', icon: 'bills' },
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'goals', label: 'Goals', icon: 'goals' },
];

interface TabBarProps {
  /** Number of Due soon items per tab, shown as an amber dot with a hidden label for VoiceOver. */
  dueSoon: Partial<Record<TabId, number>>;
  /** Re-tapping the active tab (scroll to top, pop to root). */
  onActiveReselect: (tab: TabId) => void;
}

/** Bottom tab bar (DESIGN 4.1). Each tab is a quarter of the width and 49 pt high, above the 44 pt minimum. */
export function TabBar({ dueSoon, onActiveReselect }: TabBarProps) {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Main">
      <div role="tablist" className="tabbar__list">
        {TABS.map((tab) => {
          const active = pathname === `/${tab.id}` || pathname.startsWith(`/${tab.id}/`);
          const count = dueSoon[tab.id] ?? 0;
          return (
            <Link
              key={tab.id}
              to={`/${tab.id}`}
              role="tab"
              aria-selected={active}
              className={`tabbar__item pressable${active ? ' tabbar__item--active' : ''}`}
              aria-label={count > 0 ? `${tab.label}, ${count} due soon` : tab.label}
              data-testid={`tab-${tab.id}`}
              onClick={(e) => {
                if (active) {
                  e.preventDefault();
                  onActiveReselect(tab.id);
                }
              }}
            >
              <span className="tabbar__icon">
                <Icon name={tab.icon} size={26} filled={active} />
                {count > 0 && <span className="tabbar__dot" data-testid={`tab-${tab.id}-dot`} />}
              </span>
              <span className="tabbar__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
