/**
 * ============================================================
 *  MUSEUM — nguồn dữ liệu DUY NHẤT (single museum)
 * ============================================================
 *
 * App phục vụ một bảo tàng cố định. Sửa thông tin trực tiếp
 * trong CURRENT_MUSEUM bên dưới.
 * ============================================================
 */

export type MuseumZone = {
  name: string;
  floor: string;
  items: number;
};

export type MuseumRecord = {
  /** ID duy nhất, dùng trong URL: /museum/[id] */
  id: string;
  name: string;
  city: string;
  /** Nhãn thể loại hiển thị trên card */
  tag: string;
  /** Màu chủ đạo của bảo tàng (hex) */
  color: string;
  address: string;
  /** GPS từ Museum.Latitude / Longitude — dùng mở bản đồ. */
  latitude?: number;
  longitude?: number;
  phone: string;
  openHours: string;
  closedDay: string;
  /** Giá vé hiển thị dạng string, ví dụ "30.000 đ / người" */
  ticketPrice: string;
  /** Giá vé số (đồng) — dùng cho màn Ticket */
  ticketPriceVnd: number;
  /** Tổng số hiện vật */
  exhibits: number;
  /** Năm thành lập, dạng string */
  founded: string;
  description: string;
  highlights: string[];
  zones: MuseumZone[];
  thumbnailUrl?: string;
};

// ─────────────────────────────────────────────
//  BẢO TÀNG HIỆN TẠI — chỉ chỉnh sửa ở đây
// ─────────────────────────────────────────────

export const CURRENT_MUSEUM: MuseumRecord = {
  id: 'm1',
  name: 'Bảo tàng Lịch sử Quốc gia',
  city: 'Hà Nội',
  tag: 'Lịch sử',
  color: '#C89B3C',
  address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
  phone: '024 3825 2853',
  openHours: '8:00 – 17:00',
  closedDay: 'Thứ Hai',
  ticketPrice: '30.000 đ / người',
  ticketPriceVnd: 30000,
  exhibits: 200000,
  founded: '1958',
  description:
    'Bảo tàng Lịch sử Quốc gia là nơi lưu giữ và trưng bày hơn 200.000 hiện vật phản ánh toàn bộ tiến trình lịch sử Việt Nam từ thời tiền sử đến thời hiện đại. Đây là một trong những bảo tàng lớn nhất và quan trọng nhất tại Việt Nam.',
  highlights: [
    'Trống đồng Đông Sơn niên đại 2.500 năm',
    'Bộ sưu tập gốm sứ các thời đại',
    'Hiện vật thời Hùng Vương dựng nước',
    'Trải nghiệm AR tại 3 khu vực đặc biệt',
  ],
  zones: [
    { name: 'Tiền sử - Sơ sử', floor: 'Tầng 1', items: 450 },
    { name: 'Văn hóa Đông Sơn', floor: 'Tầng 1', items: 320 },
    { name: 'Các vương triều phong kiến', floor: 'Tầng 2', items: 580 },
    { name: 'Cận - Hiện đại', floor: 'Tầng 3', items: 290 },
  ],
};

/** @deprecated Dùng CURRENT_MUSEUM — giữ array 1 phần tử để tương thích cũ */
export const MUSEUMS: MuseumRecord[] = [CURRENT_MUSEUM];

export const MUSEUM_MAP: Record<string, MuseumRecord> = {
  [CURRENT_MUSEUM.id]: CURRENT_MUSEUM,
};

export function getMuseumById(id: string): MuseumRecord | undefined {
  return id === CURRENT_MUSEUM.id ? CURRENT_MUSEUM : undefined;
}
