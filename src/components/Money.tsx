import { useMoney } from '../app/StoreProvider.tsx';

interface MoneyProps {
  minor: number;
  testId?: string;
  className?: string;
  /** Hero numbers step down 44 -> 36 -> 28 px so they stay on one line at 375 px (DESIGN 4.5). */
  hero?: boolean;
}

/** Money in the default currency. `data-minor` carries the exact integer for stable assertions. */
export function Money({ minor, testId, className = '', hero = false }: MoneyProps) {
  const text = useMoney()(minor);
  const size = hero ? (text.length > 13 ? ' money--hero-s' : text.length > 10 ? ' money--hero-m' : '') : '';
  return (
    <span className={`money${hero ? ' money--hero' : ''}${size} ${className}`.trim()} data-testid={testId} data-minor={minor}>
      {text}
    </span>
  );
}
