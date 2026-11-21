/** File save/share helpers shared by backup (AC-APP-8) and, later, list snapshots (AC-HOME-10). */

export type FileOutcome = 'shared' | 'downloaded' | 'cancelled';

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Offers the file through the iOS share sheet where possible (Save to Files, AirDrop) and falls back to a download.
 * Must be called straight from a tap handler so the browser still sees the user gesture.
 * A dismissed share sheet returns 'cancelled' so callers do not record a backup that was not saved.
 */
export async function shareOrDownloadFile(filename: string, text: string, mime = 'application/json'): Promise<FileOutcome> {
  const file = new File([text], filename, { type: mime });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Any other share failure: fall back to a plain download below.
    }
  }
  download(file);
  return 'downloaded';
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

/** Copies text to the clipboard from a tap handler. Returns false when the browser refuses (the caller then shows the text to copy by hand). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
