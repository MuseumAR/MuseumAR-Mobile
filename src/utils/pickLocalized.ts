import type { AppLanguage } from '../services/languagePrefs';

type LocalizedRow = {
  languageCode?: string | null;
  [key: string]: unknown;
};

/**
 * Pick a translation row for the active language.
 * Prefer exact languageCode match; otherwise keep the first available row
 * (or undefined so callers can fall back to flat current fields).
 */
export function pickLocalizedRow<T extends LocalizedRow>(
  rows: T[] | null | undefined,
  lang: AppLanguage | string,
): T | undefined {
  if (!rows || rows.length === 0) return undefined;
  const code = String(lang).toLowerCase();
  return (
    rows.find((r) => r.languageCode?.toLowerCase() === code) ??
    rows[0]
  );
}

/** Pick a string field from translations, else fallback. */
export function pickLocalizedField<T extends LocalizedRow>(
  rows: T[] | null | undefined,
  lang: AppLanguage | string,
  field: keyof T,
  fallback?: string | null,
): string | undefined {
  const row = pickLocalizedRow(rows, lang);
  if (row) {
    const value = row[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  return undefined;
}
