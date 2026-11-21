import type { QrMatrix } from '../lib/shareLink.ts';

const QUIET = 4;

/** QR code as one SVG path on a white quiet zone (scanners need light margins even in dark mode). */
export function QrCode({ matrix, label, testId }: { matrix: QrMatrix; label: string; testId: string }) {
  const { size, dark } = matrix;
  let path = '';
  for (let i = 0; i < dark.length; i++) {
    if (dark[i]) path += `M${(i % size) + QUIET} ${Math.floor(i / size) + QUIET}h1v1h-1z`;
  }
  const total = size + QUIET * 2;
  return (
    <svg className="qr" viewBox={`0 0 ${total} ${total}`} role="img" aria-label={label} shapeRendering="crispEdges" data-testid={testId} data-modules={size}>
      <rect width={total} height={total} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
