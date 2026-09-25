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

/**
 * BE stores wwwroot assets with the uploader's host baked in
 * (`{scheme}://{host}/uploads/...`), so rows written from another machine or
 * another environment point somewhere the phone cannot reach.
 */
function isLocallyServedPath(pathname: string): boolean {
  return /^\/(uploads|seed-assets)\//i.test(pathname);
}

/**
 * Make a BE media URL absolute and phone-reachable.
 * Relative `/uploads/...` gets the API origin; wwwroot URLs keep only their
 * path. Cloudinary and other external hosts pass through unchanged.
 */
export function toAbsoluteMediaUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^(file|data):/i.test(trimmed)) return trimmed;

  if (!/^https?:\/\//i.test(trimmed)) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_ORIGIN}${path}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (isLoopbackHost(parsed.hostname) || isLocallyServedPath(parsed.pathname)) {
      const origin = new URL(API_ORIGIN);
      parsed.protocol = origin.protocol;
      parsed.host = origin.host;
      return parsed.toString();
    }
  } catch {
    // keep original
  }

  return trimmed;
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

  const out = toAbsoluteMediaUrl(trimmed);
  if (!out) return undefined;

  return rewriteCloudinaryForRn(out, options?.preserveAlpha === true);
}

/**
 * Prefer a downloaded pack file when present so exhibition/offline thumbs work.
 * Fall back to a rewritten remote URL when nothing is cached locally.
 */
export function pickDisplayImageUrl(
  remote?: string | null,
  logicalKey?: string,
  options?: ImageRewriteOptions,
): string | undefined {
  const local = resolveOfflineUri(remote, logicalKey);
  if (local) return local;

  return rewriteRemoteImageUrl(remote, options);
}
