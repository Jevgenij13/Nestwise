import type { EnvelopeError } from '../lib/snapshot.ts';

/** User-facing wording for import errors (DESIGN section 7). Nothing is ever changed when one of these shows. */
export function importErrorText(error: EnvelopeError): string {
  switch (error.code) {
    case 'not-nestwise':
      return "That doesn't look like a Nestwise file. Nothing was changed.";
    case 'newer-version':
      return 'This was made with a newer version of Nestwise. Update the app first. Nothing was changed.';
    case 'not-json':
    case 'migration-failed':
      return 'This file is damaged. Nothing was changed.';
    case 'bad-code':
    case 'invalid':
      return `${error.message} Nothing was changed.`;
  }
}
