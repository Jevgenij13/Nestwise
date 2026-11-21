import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppData } from '../../app/StoreProvider.tsx';
import { HomeRoot } from './HomeRoot.tsx';
import { HouseholdSetup } from './HouseholdSetup.tsx';
import { ListScreen } from './ListScreen.tsx';

/** Home tab: first-use setup until a household exists (AC-HOME-1), then the lists overview and list screens (/home/list/:id). */
export function HomeScreen() {
  const { household } = useAppData();
  if (!household) return <HouseholdSetup />;
  return (
    <Routes>
      <Route index element={<HomeRoot />} />
      <Route path="list/:listId" element={<ListScreen />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
