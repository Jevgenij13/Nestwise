import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  testId: string;
  /** Optional content before the label (member avatar). */
  leading?: ReactNode;
}

interface ChoiceChipsProps<T extends string | number> {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  testId: string;
  /** Hides the visible label (the group keeps it as its accessible name), e.g. All / Mine. */
  hideLabel?: boolean;
}

/** Single-select choice chips (`role="radio"`), wrapping onto several lines (DESIGN 4.4). */
export function ChoiceChips<T extends string | number>({ label, options, value, onChange, testId, hideLabel = false }: ChoiceChipsProps<T>) {
  return (
    <div className="field" role="radiogroup" aria-label={label} data-testid={testId}>
      {!hideLabel && <span className="field__label" aria-hidden="true">{label}</span>}
      <div className="chips">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`chip pressable${selected ? ' chip--selected' : ''}`}
              onClick={() => onChange(option.value)}
              data-testid={option.testId}
            >
              <span className="chip__visual">
                {selected && <Icon name="check" size={16} />}
                {option.leading}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StatusPillProps {
  tone: 'due-soon' | 'overdue' | 'paused' | 'done';
  icon?: IconName;
  children: ReactNode;
  testId?: string;
}

/** Icon plus words, never colour alone (DESIGN design principle 5). */
export function StatusPill({ tone, icon, children, testId }: StatusPillProps) {
  return (
    <span className={`pill pill--${tone}`} data-testid={testId}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
