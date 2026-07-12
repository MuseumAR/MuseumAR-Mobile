import { ExhibitDto, ExhibitTranslationDto } from '../services/apiService';
import type { ExhibitRecord } from '../data/exhibits';

/** Bảng màu chủ đạo dùng khi backend không cung cấp màu cho hiện vật. */
const COLOR_PALETTE = ['#C89B3C', '#B45309', '#0369A1', '#047857', '#9A6F1F', '#4B5563', '#D97706'];

/** Chọn bản dịch theo ngôn ngữ ưu tiên, fallback về bản đầu tiên. */
export function pickTranslation(
  dto: ExhibitDto,
  lang = 'vi',
): ExhibitTranslationDto | undefined {
  if (!dto.translations || dto.translations.length === 0) return undefined;
  return (
    dto.translations.find((t) => t.languageCode?.toLowerCase() === lang.toLowerCase()) ??
    dto.translations[0]
  );
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
): ExhibitRecord {
  const tr = pickTranslation(dto);
  const color = COLOR_PALETTE[dto.id % COLOR_PALETTE.length];
  const description = tr?.description ?? '';

  return {
    id: String(dto.id),
    museumId: String(dto.museumId),
    title: tr?.title ?? dto.exhibitCode ?? `Hiện vật #${dto.id}`,
    era: '',
    category: categoryName ?? (dto.categoryId != null ? `Danh mục ${dto.categoryId}` : 'Hiện vật'),
    origin: '',
    material: '',
    description,
    arAvailable: Boolean(dto.arOverlayUrl || dto.arMarkerUrl),
    emoji: '🏺',
    color,
    audioUrl: tr?.audioUrl ?? '',
    audioDuration: tr?.audioDuration ?? 0,
    transcript: splitTranscript(description),
    highlights: [],
    thumbnailUrl: dto.thumbnailUrl,
  };
}
