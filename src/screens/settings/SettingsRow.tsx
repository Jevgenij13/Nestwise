import type { ReactNode } from 'react';
import { Icon } from '../../components/Icon.tsx';

interface SettingsRowProps {
  label: string;
  value?: ReactNode;
  testId: string;
  onPress?: () => void;
  /** Right-hand control (toggle). */
  control?: ReactNode;
}

/** Settings row: label left, value and chevron right. A row without `onPress` is static. */
export function SettingsRow({ label, value, testId, onPress, control }: SettingsRowProps) {
  const content = (
    <>
      <span className="srow__label t-body">{label}</span>
      {value !== undefined && <span className="srow__value t-callout" data-testid={`${testId}-value`}>{value}</span>}
      {control}
      {onPress && <Icon name="chevron-right" size={18} />}
    </>
  );
  return onPress ? (
    <li className="srow">
      <button type="button" className="srow__btn pressable" onClick={onPress} data-testid={testId}>{content}</button>
    </li>
  ) : (
    <li className="srow srow--static" data-testid={testId}>{content}</li>
  );
}
