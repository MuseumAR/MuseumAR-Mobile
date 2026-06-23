/**
 * ============================================================
 *  MUSEUM MAPPER — nguồn dữ liệu DUY NHẤT cho toàn bộ app
 * ============================================================
 *
 * Để THÊM bảo tàng mới:
 *   1. Copy một object bên dưới
 *   2. Đặt id mới (ví dụ 'm6')
 *   3. Điền đầy đủ các trường
 *   4. Thêm gói AR tương ứng vào src/data/arPacks.ts nếu có
 *
 * Để SỬA bảo tàng: chỉnh trực tiếp object tương ứng bên dưới.
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
  phone: string;
  openHours: string;
  closedDay: string;
  /** Giá vé hiển thị dạng string, ví dụ "30.000 đ / người" */
  ticketPrice: string;
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
//  DỮ LIỆU BẢO TÀNG — chỉ chỉnh sửa ở đây
// ─────────────────────────────────────────────

export const MUSEUMS: MuseumRecord[] = [
  {
    id: 'm1',
    name: 'Bảo tàng Lịch sử Quốc gia',
    city: 'Hà Nội',
    tag: 'Lịch sử',
    color: '#1A6FA8',
    address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    phone: '024 3825 2853',
    openHours: '8:00 – 17:00',
    closedDay: 'Thứ Hai',
    ticketPrice: '30.000 đ / người',
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
  },
  {
    id: 'm2',
    name: 'Bảo tàng Chứng tích Chiến tranh',
    city: 'TP. Hồ Chí Minh',
    tag: 'Chiến tranh',
    color: '#DC2626',
    address: '28 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
    phone: '028 3930 5587',
    openHours: '7:30 – 18:00',
    closedDay: 'Không đóng cửa',
    ticketPrice: '40.000 đ / người',
    exhibits: 20000,
    founded: '1975',
    description:
      'Bảo tàng Chứng tích Chiến tranh lưu giữ và trưng bày các tài liệu, hình ảnh và hiện vật về cuộc kháng chiến chống Mỹ cứu nước. Đây là một trong những điểm tham quan được du khách nước ngoài ghé thăm nhiều nhất tại Việt Nam.',
    highlights: [
      'Phòng tội ác chiến tranh với hình ảnh tư liệu quý hiếm',
      'Khu trưng bày vũ khí và phương tiện chiến tranh ngoài trời',
      'Bộ sưu tập ảnh của phóng viên chiến trường quốc tế',
      'Hệ thống tái hiện nhà tù Côn Đảo',
    ],
    zones: [
      { name: 'Tội ác chiến tranh', floor: 'Tầng 1', items: 180 },
      { name: 'Hậu quả chất độc da cam', floor: 'Tầng 2', items: 120 },
      { name: 'Phóng viên chiến trường', floor: 'Tầng 3', items: 210 },
      { name: 'Vũ khí - Thiết bị', floor: 'Ngoài trời', items: 95 },
    ],
  },
  {
    id: 'm3',
    name: 'Bảo tàng Dân tộc học Việt Nam',
    city: 'Hà Nội',
    tag: 'Văn hóa',
    color: '#059669',
    address: 'Đường Nguyễn Văn Huyên, Cầu Giấy, Hà Nội',
    phone: '024 3756 2193',
    openHours: '8:30 – 17:30',
    closedDay: 'Thứ Hai',
    ticketPrice: '40.000 đ / người',
    exhibits: 15000,
    founded: '1997',
    description:
      'Bảo tàng Dân tộc học Việt Nam giới thiệu văn hóa, đời sống và phong tục tập quán của 54 dân tộc anh em trên lãnh thổ Việt Nam. Khuôn viên bảo tàng rộng lớn với các công trình kiến trúc nhà sàn truyền thống được phục dựng nguyên bản.',
    highlights: [
      'Nhà sàn truyền thống của 10 dân tộc thiểu số',
      'Không gian văn hóa người Kinh xưa',
      'Bộ trang phục 54 dân tộc Việt Nam',
      'Biểu diễn nhạc cụ dân tộc cuối tuần',
    ],
    zones: [
      { name: 'Người Kinh', floor: 'Tầng 1', items: 340 },
      { name: 'Dân tộc Tây Bắc', floor: 'Tầng 2', items: 280 },
      { name: 'Dân tộc Tây Nguyên', floor: 'Tầng 2', items: 260 },
      { name: 'Nhà truyền thống', floor: 'Ngoài trời', items: 10 },
    ],
  },
  {
    id: 'm4',
    name: 'Bảo tàng Điêu khắc Chăm',
    city: 'Đà Nẵng',
    tag: 'Điêu khắc',
    color: '#D97706',
    address: '2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng',
    phone: '0236 3572 935',
    openHours: '7:00 – 17:00',
    closedDay: 'Không đóng cửa',
    ticketPrice: '60.000 đ / người',
    exhibits: 2000,
    founded: '1919',
    description:
      'Bảo tàng Điêu khắc Chăm Đà Nẵng là nơi lưu giữ bộ sưu tập điêu khắc Champa lớn nhất thế giới. Các hiện vật được khai quật từ các thánh địa Champa như Mỹ Sơn, Trà Kiệu, Đồng Dương thể hiện nghệ thuật đỉnh cao của vương quốc Champa hưng thịnh.',
    highlights: [
      'Tượng thần Shiva từ thánh địa Mỹ Sơn',
      'Đài thờ Trà Kiệu thế kỷ X',
      'Bộ sưu tập Linga - Yoni',
      'Tượng vũ nữ Apsara độc đáo',
    ],
    zones: [
      { name: 'Phòng Mỹ Sơn', floor: 'Tầng 1', items: 180 },
      { name: 'Phòng Trà Kiệu', floor: 'Tầng 1', items: 120 },
      { name: 'Phòng Đồng Dương', floor: 'Tầng 2', items: 95 },
      { name: 'Phòng Tháp Mẫm', floor: 'Tầng 2', items: 85 },
    ],
  },
  {
    id: 'm5',
    name: 'Bảo tàng Mỹ thuật Việt Nam',
    city: 'Hà Nội',
    tag: 'Nghệ thuật',
    color: '#7C3AED',
    address: '66 Nguyễn Thái Học, Ba Đình, Hà Nội',
    phone: '024 3823 3084',
    openHours: '8:30 – 17:00',
    closedDay: 'Thứ Hai',
    ticketPrice: '40.000 đ / người',
    exhibits: 17000,
    founded: '1966',
    description:
      'Bảo tàng Mỹ thuật Việt Nam là nơi lưu giữ và trưng bày các tác phẩm nghệ thuật tiêu biểu của Việt Nam qua các thời kỳ, từ nghệ thuật cổ đại đến hiện đại. Bảo tàng là điểm đến không thể bỏ qua đối với những ai yêu thích hội họa và điêu khắc.',
    highlights: [
      'Tranh sơn mài - đặc sản nghệ thuật Việt Nam',
      'Tác phẩm của danh họa Tô Ngọc Vân, Nguyễn Phan Chánh',
      'Điêu khắc dân gian đình làng Bắc Bộ',
      'Nghệ thuật hiện đại và đương đại Việt Nam',
    ],
    zones: [
      { name: 'Mỹ thuật cổ đại', floor: 'Tầng 1', items: 220 },
      { name: 'Mỹ thuật dân gian', floor: 'Tầng 1', items: 180 },
      { name: 'Hội họa hiện đại', floor: 'Tầng 2', items: 310 },
      { name: 'Nghệ thuật đương đại', floor: 'Tầng 3', items: 150 },
    ],
  },
];

// ─────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────

/** Tra cứu nhanh theo ID */
export const MUSEUM_MAP: Record<string, MuseumRecord> =
  Object.fromEntries(MUSEUMS.map((m) => [m.id, m]));

export function getMuseumById(id: string): MuseumRecord | undefined {
  return MUSEUM_MAP[id];
}
