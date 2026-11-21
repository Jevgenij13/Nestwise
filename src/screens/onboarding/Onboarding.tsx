import { useMemo, useState } from 'react';
import { currencyOptions } from '../../lib/currencies.ts';
import { deviceLocale } from '../../app/locale.ts';
import { isInstallablePage, readInstallContext } from '../../app/install.ts';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { InstallSteps } from '../../components/InstallSteps.tsx';

interface OnboardingProps {
  initialCurrency: string;
  /** Commits the chosen currency and marks onboarding done. Also used by Skip. */
  onFinish: (currency: string) => void;
}

const LAST_PAGE = 2;

/** First-run intro (AC-APP-1): 3 skippable pages; the last confirms the currency, preselected from the device locale. */
export function Onboarding({ initialCurrency, onFinish }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const [currency, setCurrency] = useState(initialCurrency);
  const options = useMemo(() => currencyOptions([initialCurrency], deviceLocale() ?? 'en'), [initialCurrency]);
  const inSafari = isInstallablePage(readInstallContext());
  const last = page === LAST_PAGE;
  const logo = `${import.meta.env.BASE_URL}icons/icon-192.png`;

  return (
    <div className="onboarding" data-testid="onboarding" role="region" aria-label="Welcome to Nestwise">
      <div className="onboarding__top">
        <button type="button" className="onboarding__skip tap-target" onClick={() => onFinish(currency)} data-testid="onboarding-skip">Skip</button>
      </div>

      <div className="onboarding__page" key={page} data-testid={`onboarding-page-${page + 1}`}>
        {page === 0 && (
          <>
            <img src={logo} width={120} height={120} alt="" className="onboarding__logo" />
            <h1 className="t-title-1">Welcome to Nestwise</h1>
            <p className="t-body onboarding__text">Bills, chores and savings goals in one calm place.</p>
          </>
        )}
        {page === 1 && (
          <>
            <span className="onboarding__icon"><Icon name="lock" size={56} /></span>
            <h1 className="t-title-1">Your data stays on this phone</h1>
            <p className="t-body onboarding__text">No account, no cost, works offline. Add Nestwise to your Home Screen first, then enter your things there.</p>
            {inSafari && (
              <div className="banner banner--info" data-testid="onboarding-safari-warning">
                <span className="banner__icon"><Icon name="info" size={22} /></span>
                <div className="banner__body">
                  <strong>You&apos;re in Safari.</strong>
                  <InstallSteps />
                </div>
              </div>
            )}
          </>
        )}
        {page === 2 && (
          <>
            <h1 className="t-title-1">Pick your currency</h1>
            <p className="t-body onboarding__text">Used everywhere. You can change it in Settings.</p>
            <div className="field onboarding__field">
              <label className="field__label" htmlFor="onboarding-currency">Currency</label>
              <div className="input input--select">
                <select id="onboarding-currency" className="input__control" value={currency} onChange={(e) => setCurrency(e.target.value)} data-testid="onboarding-currency-select">
                  {options.map((o) => <option key={o.code} value={o.code}>{o.code} {o.name}</option>)}
                </select>
                <Icon name="chevron-down" size={18} />
              </div>
              <p className="field__hint t-footnote">Amounts are not converted if you change this later.</p>
            </div>
          </>
        )}
      </div>

      <div className="onboarding__bottom">
        <div className="dots" aria-hidden="true">
          {[0, 1, 2].map((i) => <span key={i} className={`dot${i === page ? ' dot--on' : ''}`} />)}
        </div>
        <p className="sr-only" aria-live="polite">Step {page + 1} of 3</p>
        {last ? (
          <Button block onClick={() => onFinish(currency)} data-testid="onboarding-start">Start using Nestwise</Button>
        ) : (
          <Button block onClick={() => setPage(page + 1)} data-testid="onboarding-next">Next</Button>
        )}
      </div>
    </div>
  );
}
