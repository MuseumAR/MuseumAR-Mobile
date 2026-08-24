import { API_ORIGIN } from '../config/apiConfig';
import { resolveOfflineUri } from '../services/offlineMedia';

function isLoopbackHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]'
  );
}

export type ImageRewriteOptions = {
  /** Keep PNG alpha (AR overlays). Default jpg is for RN Image thumbnails. */
  preserveAlpha?: boolean;
};

/**
 * React Native Image cannot decode many Cloudinary `f_auto` payloads (AVIF/WebP).
 * Chrome can, which looks like "the URL works but the app is blank".
 * AR overlays must stay PNG or Unity/Image flatten onto a white background.
 */
function rewriteCloudinaryForRn(url: string, preserveAlpha = false): string {
  if (!/res\.cloudinary\.com/i.test(url) || !/\/image\/upload\//i.test(url)) {
    return url;
  }
  const fmt = preserveAlpha ? 'f_png' : 'f_jpg';
  const formats = preserveAlpha
    ? /([,/])f_(?:auto|avif|webp|jpg|jpeg)(?=[,/])/gi
    : /([,/])f_(?:auto|avif|webp)(?=[,/])/gi;
  let out = url.replace(formats, `$1${fmt}`);
  if (!new RegExp(`/image/upload/[^/]*${fmt}`, 'i').test(out)) {
    out = out.replace(/(\/image\/upload\/)/i, `$1${fmt}/`);
  }
  return out;
}

/** Turn a BE media URL into something RN Image can fetch on a phone. */
export function rewriteRemoteImageUrl(
  url?: string | null,
  options?: ImageRewriteOptions,
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith('file:')) return trimmed || undefined;

  let out = trimmed;
  if (!/^https?:\/\//i.test(out)) {
    const path = out.startsWith('/') ? out : `/${out}`;
    out = `${API_ORIGIN}${path}`;
  } else {
    try {
      const parsed = new URL(out);
      if (isLoopbackHost(parsed.hostname)) {
        const origin = new URL(API_ORIGIN);
        parsed.protocol = origin.protocol;
        parsed.host = origin.host;
        out = parsed.toString();
      }
    } catch {
      // keep original
    }
  }

  return rewriteCloudinaryForRn(out, options?.preserveAlpha === true);
}

/**
 * Prefer a live, phone-reachable URL. Use a downloaded file:// only when there
 * is no remote URL (offline pack with a missing remote field).
 */
export function pickDisplayImageUrl(
  remote?: string | null,
  logicalKey?: string,
  options?: ImageRewriteOptions,
): string | undefined {
  const rewritten = rewriteRemoteImageUrl(remote, options);
  if (rewritten) return rewritten;
  return resolveOfflineUri(remote, logicalKey);
}
