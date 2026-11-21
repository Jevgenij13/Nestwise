import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { AppData } from '../types.ts';
import { App } from '../App.tsx';
import { createAppStore } from '../app/store.ts';
import { createStorage, STORAGE_KEY, type StorageBackend } from '../lib/storage.ts';

export const TODAY_ISO = '2026-11-21T10:00:00';

export function memoryBackend(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const backend: StorageBackend & { map: Map<string, string> } = {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
  return backend;
}

interface Options {
  /** Pre-saved data (as if the app had run before). Omit for a first run. */
  data?: AppData;
  raw?: string;
  locales?: string[];
  route?: string;
}

/** Renders the whole app on a memory storage at the fixed test date 2026-11-21. */
export function renderApp({ data, raw, locales = ['en-US'], route = '/today' }: Options = {}) {
  const backend = memoryBackend(raw !== undefined ? { [STORAGE_KEY]: raw } : {});
  const clock = () => new Date(TODAY_ISO);
  const storage = createStorage(backend);
  if (data) storage.save(data, new Date(TODAY_ISO).toISOString());
  const store = createAppStore({ storage: createStorage(backend), clock, locales });
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <App store={store} />
    </MemoryRouter>,
  );
  return { store, backend, user, ...view };
}
