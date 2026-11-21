import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon.tsx';

interface FieldFrameProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  id: string;
  testId: string;
  children: ReactNode;
}

function FieldFrame({ label, error, hint, id, testId, children }: FieldFrameProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field__error" id={`${id}-msg`} data-testid={`${testId}-error`}>
          <Icon name="warning" size={16} />
          {error}
        </p>
      ) : (
        hint && <p className="field__hint t-footnote" id={`${id}-msg`} data-testid={`${testId}-hint`}>{hint}</p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'id'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  testId: string;
  /** Shown before the input, e.g. a currency code. */
  prefix?: string;
}

export function TextField({ label, value, onChange, error, hint, testId, prefix, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  const described = error || hint ? `${id}-msg` : undefined;
  return (
    <FieldFrame label={label} error={error} hint={hint} id={id} testId={testId}>
      <div className={`input${error ? ' input--error' : ''}${prefix ? ' input--prefixed' : ''}`}>
        {prefix && <span className="input__prefix" aria-hidden="true">{prefix}</span>}
        <input id={id} className={`input__control ${className}`.trim()} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={described} data-testid={testId} {...rest} />
      </div>
    </FieldFrame>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'id'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  testId: string;
}

export function TextAreaField({ label, value, onChange, error, hint, testId, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldFrame label={label} error={error} hint={hint} id={id} testId={testId}>
      <div className={`input input--area${error ? ' input--error' : ''}`}>
        <textarea id={id} className="input__control" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-msg` : undefined} data-testid={testId} {...rest} />
      </div>
    </FieldFrame>
  );
}
