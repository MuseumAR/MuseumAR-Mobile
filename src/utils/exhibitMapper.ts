import { ExhibitDto, ExhibitTranslationDto } from '../services/apiService';
import type { ExhibitRecord } from '../data/exhibits';
import type { AppLanguage } from '../services/languagePrefs';
import {
  audioLogicalKey,
  markerLogicalKey,
  overlayLogicalKey,
  resolveOfflineUri,
  thumbLogicalKey,
} from '../services/offlineMedia';
import { pickLocalizedRow } from './pickLocalized';

/** Bảng màu chủ đạo dùng khi backend không cung cấp màu cho hiện vật. */
const COLOR_PALETTE = ['#C89B3C', '#B45309', '#0369A1', '#047857', '#9A6F1F', '#4B5563', '#D97706'];

/** Chọn bản dịch theo ngôn ngữ ưu tiên; không có thì dùng bản đầu / dữ liệu hiện có. */
export function pickTranslation(
  dto: ExhibitDto,
  lang: AppLanguage | string = 'vi',
): ExhibitTranslationDto | undefined {
  return pickLocalizedRow(dto.translations, lang);
}

/** Tách mô tả dài thành các đoạn transcript ngắn để hiển thị theo audio. */
function splitTranscript(description?: string): string[] {
  if (!description) return [];
  return description
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZĐÀ-Ỹ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Chuyển ExhibitDto (từ backend) sang ExhibitRecord (định dạng UI đang dùng).
 * Các trường không có trong DTO sẽ được điền giá trị mặc định hợp lý.
 */
export function mapExhibitDtoToRecord(
  dto: ExhibitDto,
  categoryName?: string,
  lang: AppLanguage | string = 'vi',
): ExhibitRecord {
  const tr = pickTranslation(dto, lang);
  const color = COLOR_PALETTE[dto.id % COLOR_PALETTE.length];
  const description = tr?.description ?? '';
  const meta = dto.exhibitMetadata;

  return {
    id: String(dto.id),
    museumId: String(dto.museumId),
    title: tr?.title ?? dto.exhibitCode ?? `Hiện vật #${dto.id}`,
    era:
      lang === 'en' && meta?.eraEn?.trim()
        ? meta.eraEn.trim()
        : (meta?.era ?? ''),
    category:
      categoryName ??
      (dto.categoryId != null ? `Danh mục ${dto.categoryId}` : 'Hiện vật'),
    categoryId: dto.categoryId,
    themeId: dto.themeId,
    tagIds: dto.tagIds,
    origin: '',
    material: '',
    description,
    arAvailable: Boolean(dto.arOverlayUrl || dto.arMarkerUrl),
    arOverlayUrl:
      resolveOfflineUri(dto.arOverlayUrl, overlayLogicalKey(dto.id)) ?? dto.arOverlayUrl,
    arMarkerUrl:
      resolveOfflineUri(dto.arMarkerUrl, markerLogicalKey(dto.id)) ?? dto.arMarkerUrl,
    emoji: '🏺',
    color,
    audioUrl:
      resolveOfflineUri(tr?.audioUrl, audioLogicalKey(dto.id, String(lang))) ??
      tr?.audioUrl ??
      '',
    audioDuration: tr?.audioDuration ?? 0,
    transcript: splitTranscript(description),
    highlights: (() => {
      const event =
        lang === 'en' && meta?.historicalEventEn?.trim()
          ? meta.historicalEventEn.trim()
          : meta?.historicalEvent?.trim();
      return event ? [event] : [];
    })(),
    thumbnailUrl:
      resolveOfflineUri(dto.thumbnailUrl, thumbLogicalKey(dto.id)) ?? dto.thumbnailUrl,
  };
}
