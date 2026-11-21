/** Share links (AC-HOME-14): the snapshot travels in the URL fragment, which browsers never send to a server. */

const ROUTE = '#/shared/';

export function buildShareLink(code: string, pageUrl: string): string {
  const base = pageUrl.split('#')[0] ?? pageUrl;
  return `${base}${ROUTE}${code}`;
}

/** The code in a landing-page path such as "/shared/NW2.abc", or null. */
export function codeFromPath(pathname: string): string | null {
  const match = /^\/shared\/(NW[12]\.[A-Za-z0-9_-]+)$/.exec(pathname);
  return match?.[1] ?? null;
}

export interface QrMatrix {
  size: number;
  /** Row-major dark modules. */
  dark: boolean[];
}

/**
 * Encodes text as a QR matrix at the lowest error-correction level (the densest, so the most data fits).
 * Null when the text does not fit the largest QR version. The library loads on demand, so the main bundle stays small.
 */
export async function qrMatrix(text: string): Promise<QrMatrix | null> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'L');
  qr.addData(text, 'Byte');
  try {
    qr.make();
  } catch {
    return null;
  }
  const size = qr.getModuleCount();
  const dark: boolean[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark.push(qr.isDark(r, c));
  return { size, dark };
}
