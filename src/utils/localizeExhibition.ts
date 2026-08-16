import type { ExhibitionDto, ExhibitionTranslationDto } from '../services/apiService';
import type { AppLanguage } from '../services/languagePrefs';

function matchLang(row: ExhibitionTranslationDto, lang: string): boolean {
  return String(row.languageCode ?? '').trim().toLowerCase() === lang;
}

function trimOrNull(value?: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function fieldFromRow(
  row: ExhibitionTranslationDto | undefined,
  field: 'name' | 'description',
): string | null {
  if (!row) return null;
  return trimOrNull(row[field]);
}

/** Pick name/description from ExhibitionTranslations for the UI language. */
export function localizeExhibition(
  raw: ExhibitionDto,
  lang: AppLanguage | string = 'vi',
): ExhibitionDto {
  const code = String(lang).toLowerCase();
  const rows = raw.translations ?? [];
  const exact = rows.find((row) => matchLang(row, code));
  const wantEn = code === 'en';

  const name =
    fieldFromRow(exact, 'name') ??
    (wantEn ? trimOrNull(raw.nameEn) : null) ??
    trimOrNull(raw.name) ??
    trimOrNull(raw.nameEn);

  const description =
    fieldFromRow(exact, 'description') ??
    (wantEn ? trimOrNull(raw.descriptionEn) : null) ??
    trimOrNull(raw.description) ??
    trimOrNull(raw.descriptionEn);

  return {
    ...raw,
    name: name ?? raw.name,
    description: description ?? raw.description,
  };
}
