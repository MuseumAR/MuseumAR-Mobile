/**
 * QR code parser for MuseumAR.
 *
 * Supported formats:
 *   museumar://exhibit/<id>
 *   museumar://museum/<id>
 *   MUSEUM_EX_<id>_<CODE>  (BE auto-generated QrcodeData)
 *   https://.../exhibits/123
 *   plain numeric exhibit id
 *
 * Example: museumar://exhibit/1  |  MUSEUM_EX_12_EX-M1-12
 */

export type QRTarget =
  | { type: 'exhibit'; id: string }
  | { type: 'museum'; id: string }
  | { type: 'unknown'; raw: string };

export function parseQRCode(data: string): QRTarget {
  const trimmed = data.trim();

  const deepLink = trimmed.match(/museumar:\/\/(exhibit|museum)\/([A-Za-z0-9_-]+)/i);
  if (deepLink) {
    const kind = deepLink[1].toLowerCase();
    if (kind === 'museum') {
      return { type: 'museum', id: deepLink[2] };
    }
    return { type: 'exhibit', id: deepLink[2] };
  }

  // BE ContentService auto QR: MUSEUM_EX_{id}_{EXHIBITCODE}
  const museumEx = trimmed.match(/^MUSEUM_EX_(\d+)_/i);
  if (museumEx) {
    return { type: 'exhibit', id: museumEx[1] };
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
