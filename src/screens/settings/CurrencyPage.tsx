import { useMemo, useState } from 'react';
import { currencyOptions } from '../../lib/currencies.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useCurrency, useStore } from '../../app/StoreProvider.tsx';
import { useToast } from '../../app/toast.tsx';
import { Icon } from '../../components/Icon.tsx';

/** Searchable ISO 4217 list (AC-APP-5). Changing it relabels amounts; nothing is converted. */
export function CurrencyPage({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const toast = useToast();
  const current = useCurrency();
  const [query, setQuery] = useState('');
  const options = useMemo(() => currencyOptions([current], deviceLocale() ?? 'en'), [current]);
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.code.toLowerCase().includes(needle) || o.name.toLowerCase().includes(needle)) : options;

  const choose = (code: string) => {
    if (code !== current) {
      store.update((d) => ({ ...d, settings: { ...d.settings, currency: code } }));
      toast.show({ message: `Amounts keep their numbers and now show as ${code}. Nothing is converted.` });
    }
    onDone();
  };

  return (
    <div className="form">
      <p className="t-footnote" data-testid="currency-note">Amounts keep their numbers and are not converted when you change this.</p>
      <div className="search input">
        <Icon name="search" size={20} />
        <input type="search" className="input__control" placeholder="Search currencies" aria-label="Search currencies" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="currency-search" />
      </div>
      <ul className="card list" data-testid="currency-list">
        {shown.map((o) => (
          <li key={o.code} className="srow">
            <button type="button" className="srow__btn pressable" aria-pressed={o.code === current} onClick={() => choose(o.code)} data-testid={`currency-option-${o.code}`}>
              <span className="srow__label t-body"><strong>{o.code}</strong> <span className="t-subhead">{o.name}</span></span>
              {o.code === current && <Icon name="check" size={20} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
