import { formatMonthYear } from '../../lib/dates.ts';
import { AMOUNT_ERROR_TEXT } from '../../lib/money.ts';
import { MAX_SCENARIOS } from '../../lib/limits.ts';
import { formatDuration } from '../../lib/savings.ts';
import { monthsText, type ScenarioEval } from '../../lib/goalForm.ts';
import { deviceLocale } from '../../app/locale.ts';
import { IconButton } from '../../components/Button.tsx';
import { StatusPill } from '../../components/Chips.tsx';
import { Icon } from '../../components/Icon.tsx';

interface ScenarioCardsProps {
  texts: string[];
  scenarios: ScenarioEval[];
  fastest: number[];
  onChange: (index: number, text: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

/**
 * Side-by-side scenarios (AC-GOAL-2, 3, 8): 1 to 4 cards in a 2-column grid (the third spans the row), each with an editable
 * monthly amount and its months, "x yrs y mo" duration and target month. More than 1,200 months reads "More than 100 years".
 */
export function ScenarioCards({ texts, scenarios, fastest, onChange, onRemove, onAdd }: ScenarioCardsProps) {
  const locale = deviceLocale();
  return (
    <div className="scenarios-wrap">
      <ul className="scenarios" data-testid="goal-scenarios">
        {scenarios.map((s, i) => {
          const result = s.result;
          return (
            <li className="scenario card" key={i} data-testid={`goal-scenario-${i}`}>
              <div className="scenario__top">
                <input
                  className="scenario__input"
                  value={texts[i] ?? ''}
                  onChange={(e) => onChange(i, e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`Monthly amount, scenario ${i + 1}`}
                  aria-invalid={s.error ? true : undefined}
                  data-testid={`goal-scenario-input-${i}`}
                />
                {scenarios.length > 1 && (
                  <IconButton aria-label={`Remove scenario ${i + 1}`} onClick={() => onRemove(i)} data-testid={`goal-scenario-remove-${i}`}>
                    <Icon name="close" size={18} />
                  </IconButton>
                )}
              </div>
              <span className="scenario__unit t-footnote">per month</span>
              {s.error ? (
                <p className="scenario__msg" data-testid={`goal-scenario-error-${i}`}>{s.error === 'empty' || s.error === 'zero' ? 'Enter an amount' : AMOUNT_ERROR_TEXT[s.error]}</p>
              ) : result?.result.kind === 'ok' ? (
                <>
                  <span className="scenario__months" data-testid={`goal-scenario-months-${i}`} data-months={result.result.months}>{monthsText(result.result.months)}</span>
                  <span className="scenario__duration t-callout" data-testid={`goal-scenario-duration-${i}`}>{formatDuration(result.result.months)}</span>
                  <span className="scenario__date t-callout" data-testid={`goal-scenario-date-${i}`}>{result.targetDate ? formatMonthYear(result.targetDate, locale) : ''}</span>
                </>
              ) : (
                <p className="scenario__msg" data-testid={`goal-scenario-toolong-${i}`}>More than 100 years</p>
              )}
              {fastest.includes(i) && <StatusPill tone="done" icon="check" testId={`goal-scenario-fastest-${i}`}>Fastest</StatusPill>}
            </li>
          );
        })}
      </ul>
      {scenarios.length < MAX_SCENARIOS && (
        <button type="button" className="disclosure tap-target" onClick={onAdd} data-testid="goal-add-scenario">
          <Icon name="plus" size={18} />
          Add scenario
        </button>
      )}
    </div>
  );
}
