/**
 * QR code parser for MuseumAR.
 *
 * Supported formats:
 *   museumar://exhibit/<id>
 *   museumar://museum/<id>
 *   https://... or plain exhibit id digits (fallback)
 *
 * Create test QR at: https://www.qr-code-generator.com
 * Example: museumar://exhibit/1
 */

export type QRTarget =
  | { type: 'exhibit'; id: string }
  | { type: 'museum'; id: string }
  | { type: 'unknown'; raw: string };

export function parseQRCode(data: string): QRTarget {
  const trimmed = data.trim();

  const deepLink = trimmed.match(/museumar:\/\/(exhibit|museum)\/([A-Za-z0-9_-]+)/i);
  if (deepLink) {
    const kind = deepLink[1].toLowerCase() as 'exhibit' | 'museum';
    return { type: kind, id: deepLink[2] };
  }

  // Backend qrCodeData may be a URL ending with /exhibits/123
  const urlExhibit = trimmed.match(/\/exhibits?\/(\d+)/i);
  if (urlExhibit) {
    return { type: 'exhibit', id: urlExhibit[1] };
  }

  // Plain numeric id
  if (/^\d+$/.test(trimmed)) {
    return { type: 'exhibit', id: trimmed };
  }

  return { type: 'unknown', raw: trimmed };
}
