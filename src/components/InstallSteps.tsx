import { Icon } from './Icon.tsx';

/** The three install steps, shared by the install banner, onboarding and Settings help. */
export function InstallSteps() {
  return (
    <>
      <ol className="steps" data-testid="install-steps">
        <li>
          Tap the Share button <Icon name="share" size={18} className="inline-icon" />
        </li>
        <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
        <li>Open Nestwise from your Home Screen</li>
      </ol>
      <p className="t-footnote">Data you enter here will not show up in the installed app. To move it, use Settings &gt; Back up, then Import.</p>
    </>
  );
}
