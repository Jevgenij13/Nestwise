import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './App.tsx';
import { createAppStore } from './app/store.ts';
import { deviceLocales } from './app/locale.ts';
import { createStorage } from './lib/storage.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const store = createAppStore({
  storage: createStorage(),
  locales: deviceLocales(),
  storageManager: typeof navigator !== 'undefined' && 'storage' in navigator ? navigator.storage : null,
});
// Ask for persistent storage on every launch until granted; Safari may only grant it after user interaction.
void store.requestPersistence();

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <App store={store} />
    </HashRouter>
  </StrictMode>,
);
