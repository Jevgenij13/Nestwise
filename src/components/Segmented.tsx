import type { ChipOption } from './Chips.tsx';

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testId: string;
}

/** 2 to 3 segment control (System / Light / Dark). */
export function Segmented<T extends string>({ label, options, value, onChange, testId }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} data-testid={testId}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} className={`segmented__item${option.value === value ? ' segmented__item--on' : ''}`} onClick={() => onChange(option.value)} data-testid={option.testId}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
