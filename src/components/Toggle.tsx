interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  testId: string;
  disabled?: boolean;
}

/** iOS-style switch, 51 x 31 pt (DESIGN 4.8). */
export function Toggle({ checked, onChange, label, testId, disabled }: ToggleProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`toggle${checked ? ' toggle--on' : ''}`} onClick={() => onChange(!checked)} data-testid={testId}>
      <span className="toggle__thumb" />
    </button>
  );
}
