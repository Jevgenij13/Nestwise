import { useEffect, useState } from 'react';
import { parseSharedText } from '../../lib/shareOps.ts';
import { copyText } from '../../app/files.ts';
import { importErrorText } from '../../app/errorText.ts';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';

type Read = { state: 'reading' } | { state: 'ok'; name: string; items: number } | { state: 'error'; text: string };

/**
 * Landing page for a shared-list link (AC-HOME-14). A link opens in Safari, whose storage is separate from the installed
 * app (D3), so nothing is imported here: the page offers Copy code and the steps to paste it in the installed app.
 */
export function SharedLanding({ code }: { code: string }) {
  const [read, setRead] = useState<Read>({ state: 'reading' });
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const logo = `${import.meta.env.BASE_URL}icons/icon-192.png`;

  useEffect(() => {
    let current = true;
    void parseSharedText(code).then((result) => {
      if (!current) return;
      if (!result.ok) setRead({ state: 'error', text: importErrorText(result.error) });
      else setRead({ state: 'ok', name: result.value.lists?.[0]?.name ?? 'List', items: (result.value.items ?? []).filter((i) => i.deletedAt === null).length });
    });
    return () => {
      current = false;
    };
  }, [code]);

  const copy = async () => setCopied((await copyText(code)) ? 'done' : 'failed');

  return (
    <main className="fatal" data-testid="shared-landing">
      <div className="landing">
        <img className="landing__logo" src={logo} alt="" width={80} height={80} />
        <h1 className="t-title-1">A shared list from Nestwise</h1>
        {read.state === 'ok' && (
          <p className="t-callout" data-testid="shared-landing-summary">{read.name}, {read.items} {read.items === 1 ? 'item' : 'items'}</p>
        )}
        {read.state === 'error' && (
          <p className="field__error" role="alert" data-testid="shared-landing-error">
            <Icon name="warning" size={16} />
            {read.text}
          </p>
        )}
        <Button block onClick={() => void copy()} data-testid="shared-landing-copy">Copy code</Button>
        {copied === 'done' && <p className="t-footnote" role="status" data-testid="shared-landing-copied">Code copied.</p>}
        {copied === 'failed' && <p className="t-footnote" role="status">Your phone would not copy it. Copy the link from the address bar instead and paste that.</p>}
        <div>
          <h2 className="t-headline">To add it to your list</h2>
          <ol className="steps" data-testid="shared-landing-steps">
            <li>Open Nestwise from your Home Screen.</li>
            <li>Go to Settings &gt; Import a shared list.</li>
            <li>Paste the code and tap Merge.</li>
          </ol>
        </div>
        <p className="t-footnote">This page is only a way to carry the list to the app. Nothing was saved here, and nothing was sent to a server.</p>
      </div>
    </main>
  );
}
