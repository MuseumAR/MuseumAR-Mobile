import type { ExhibitionDto } from '../services/apiService';

export function formatExhibitionDates(
  exhibition: Pick<ExhibitionDto, 'startDate' | 'endDate'>,
  lang: 'vi' | 'en' = 'vi',
): string {
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const start = formatDate(exhibition.startDate, locale);
  const end = formatDate(exhibition.endDate, locale);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

function formatDate(value?: string | null, locale = 'vi-VN'): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
