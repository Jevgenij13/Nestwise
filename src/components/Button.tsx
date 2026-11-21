import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Required on every button: stable hook for tests. */
  'data-testid': string;
  block?: boolean;
}

export function Button({ variant = 'primary', block = false, className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`btn btn--${variant}${block ? ' btn--block' : ''} pressable ${className}`.trim()} {...rest} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  'data-testid': string;
}

/** 44 x 44 icon-only button; the aria-label is mandatory (AC-APP-13). */
export function IconButton({ className = '', type = 'button', ...rest }: IconButtonProps) {
  return <button type={type} className={`icon-btn tap-target pressable ${className}`.trim()} {...rest} />;
}
