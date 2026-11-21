import { useEffect, useMemo, useRef, useState } from 'react';
import { isLive } from '../../lib/entities.ts';
import { buildShareLink, qrMatrix, type QrMatrix } from '../../lib/shareLink.ts';
import { canCompress, createListSnapshot, encodeCompressedShareCode, encodeShareCode, listSnapshotFilename } from '../../lib/snapshot.ts';
import { copyText, shareOrDownloadFile } from '../../app/files.ts';
import { useAppData, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { useToast } from '../../app/toast.tsx';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { QrCode } from '../../components/QrCode.tsx';
import { Sheet } from '../../components/Sheet.tsx';

/** Share a copy of one list (AC-HOME-10): a .json file through the share sheet, or a code to paste. Not live: the partner merges by importing. */
export function ShareListSheet({ listId }: { listId: string }) {
  const data = useAppData();
  const today = useToday();
  const toast = useToast();
  const { close } = useOverlays();
  const list = data.lists.find((l) => l.id === listId && isLive(l));
  const [manualCopy, setManualCopy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [qr, setQr] = useState<{ matrix: QrMatrix | null } | null>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const snapshot = useMemo(() => (list ? createListSnapshot(data, list.id, new Date().toISOString()) : null), [data, list]);
  const code = useMemo(() => (snapshot ? encodeShareCode(snapshot) : ''), [snapshot]);

  useEffect(() => {
    if (!list) close();
  }, [list, close]);

  // The link and QR use the compact "NW2." code so a 50 item list can fit; browsers without compression only get the file and code.
  useEffect(() => {
    if (!snapshot || !canCompress()) return;
    let current = true;
    void encodeCompressedShareCode(snapshot).then((compact) => {
      if (current) setLink(buildShareLink(compact, window.location.href));
    });
    return () => {
      current = false;
    };
  }, [snapshot]);
  if (!list || !snapshot) return null;

  const sendFile = async () => {
    const outcome = await shareOrDownloadFile(listSnapshotFilename(list.name, today), JSON.stringify(snapshot, null, 2));
    if (outcome === 'downloaded') toast.show({ message: 'File saved' });
  };
  const copyCode = async () => {
    if (await copyText(code)) {
      setManualCopy(false);
      toast.show({ message: 'Code copied' });
      return;
    }
    // The clipboard can be blocked: select the code so it can be copied by hand.
    setManualCopy(true);
    codeRef.current?.focus();
    codeRef.current?.select();
  };

  const shareLink = async () => {
    if (!link) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${list.name} on Nestwise`, url: link });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    if (await copyText(link)) toast.show({ message: 'Link copied' });
  };
  const showQr = async () => {
    if (!link) return;
    setQr({ matrix: await qrMatrix(link) });
  };

  return (
    <Sheet title={`Share ${list.name}`} closeLabel="Close" detent="medium" onClose={close} testId="share-sheet">
      <div className="form">
        <p className="t-callout">Send a copy of this list to another phone. They can merge changes back by sending a copy to you.</p>
        <Button block onClick={() => void sendFile()} data-testid="share-file-button">
          <Icon name="share" size={20} />
          Send as file
        </Button>
        <Button variant="secondary" block onClick={() => void copyCode()} data-testid="share-copy-code-button">Copy code</Button>
        {manualCopy && <p className="t-footnote" data-testid="share-copy-manual">Your phone would not copy it. Touch and hold the code below, then choose Copy.</p>}
        {link && (
          <div className="share-row">
            <Button variant="secondary" onClick={() => void shareLink()} data-testid="share-link-button">
              <Icon name="link" size={20} />
              Share link
            </Button>
            <Button variant="secondary" onClick={() => void showQr()} data-testid="share-qr-button">
              <Icon name="qr" size={20} />
              Show QR
            </Button>
          </div>
        )}
        {qr && (qr.matrix ? (
          <div data-testid="share-qr">
            <QrCode matrix={qr.matrix} label={`QR code for ${list.name}`} testId="share-qr-svg" />
            <p className="t-footnote">Scan it with the camera on the other phone. It opens a page with a Copy code button.</p>
          </div>
        ) : (
          <p className="t-callout" role="status" data-testid="share-qr-toobig">This list is too big for a QR code. Send it as a file instead.</p>
        ))}
        <textarea ref={codeRef} className="share-code" readOnly rows={3} value={code} aria-label="Share code" onFocus={(e) => e.currentTarget.select()} data-testid="share-code-output" />
        <p className="t-footnote">Share a copy; merge changes back by importing.</p>
      </div>
    </Sheet>
  );
}
