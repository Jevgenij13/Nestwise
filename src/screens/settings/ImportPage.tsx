import { ImportPanel } from './ImportPanel.tsx';

export function ImportPage({ onDone }: { onDone: () => void }) {
  return <ImportPanel onDone={onDone} />;
}
