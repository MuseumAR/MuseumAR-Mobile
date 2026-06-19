/**
 * ============================================================
 *  EXHIBIT MAPPER — nguồn dữ liệu DUY NHẤT cho toàn bộ app
 * ============================================================
 *
 * Để THÊM hiện vật mới:
 *   1. Copy một object bên dưới
 *   2. Đặt id mới (ví dụ '7')
 *   3. Điền đầy đủ các trường (bao gồm cả transcript thuyết minh)
 *   4. Thêm id vào FEATURED_IDS nếu muốn hiển thị trên trang Home
 *
 * Để SỬA hiện vật: chỉnh trực tiếp object tương ứng bên dưới.
 *
 * audioUrl: upload file mp3 lên CDN rồi thay URL vào đây.
 *   Demo dùng: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
 * ============================================================
 */

const DEMO_AUDIO = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export type ExhibitRecord = {
  /** ID duy nhất, dùng trong URL: /exhibit/[id] và /ar-view/[id] */
  id: string;
  /** ID bảo tàng chứa hiện vật này */
  museumId: string;
  title: string;
  era: string;
  category: string;
  /** Nguồn gốc địa lý */
  origin: string;
  /** Chất liệu chế tác */
  material: string;
  description: string;
  /** Có hỗ trợ xem AR 3D không */
  arAvailable: boolean;

  // ── Thuyết minh / AR view ──────────────────
  /** Emoji đại diện hiện vật (hiển thị trên AR view) */
  emoji: string;
  /** Màu chủ đạo của hiện vật (hex) */
  color: string;
  /** URL file MP3 thuyết minh — thay bằng URL thật khi có */
  audioUrl: string;
  /** Thời lượng ước tính (giây) — sẽ bị ghi đè bởi metadata thật */
  audioDuration: number;
  /** Các đoạn transcript — cuộn theo tiến độ audio */
  transcript: string[];
  /** Thông tin nổi bật (kích thước, năm, nơi phát hiện...) */
  highlights: string[];
};

// ─────────────────────────────────────────────
//  DỮ LIỆU HIỆN VẬT — chỉ chỉnh sửa ở đây
// ─────────────────────────────────────────────

export const EXHIBITS: ExhibitRecord[] = [
  {
    id: '1',
    museumId: 'm1',
    title: 'Trống đồng Đông Sơn',
    era: 'Thế kỷ VII – I TCN',
    category: 'Đồ đồng',
    origin: 'Miền Bắc Việt Nam',
    material: 'Đồng thau',
    description:
      'Trống đồng Đông Sơn là biểu tượng văn hóa nổi bật của nền văn minh Đông Sơn. Những chiếc trống này được đúc bằng kỹ thuật tinh xảo, trang trí các hoa văn hình học và cảnh sinh hoạt của người Việt cổ. Trống đồng không chỉ là nhạc cụ mà còn là vật thiêng trong các nghi lễ tâm linh.',
    arAvailable: true,
    emoji: '🥁',
    color: '#B45309',
    audioUrl: DEMO_AUDIO,
    audioDuration: 120,
    transcript: [
      'Trống đồng Đông Sơn là biểu tượng vĩ đại nhất của nền văn minh Đông Sơn — một trong những nền văn hóa cổ đại rực rỡ nhất Đông Nam Á.',
      'Được đúc từ đồng thau qua kỹ thuật khuôn sáp thất truyền, mỗi chiếc trống là một tuyệt tác nghệ thuật với hàng trăm họa tiết hình học và cảnh sinh hoạt của người Việt cổ.',
      'Mặt trống khắc hình ngôi sao nhiều cánh tỏa sáng ở trung tâm, tượng trưng cho mặt trời — thần linh tối thượng trong tín ngưỡng Đông Sơn.',
      'Trống không chỉ là nhạc cụ trong các lễ hội mà còn là vật thiêng trong nghi lễ cầu mưa, chiến trận và mai táng — thể hiện quyền uy của tầng lớp quý tộc.',
    ],
    highlights: ['Cao 63cm, đường kính mặt 79cm', 'Trọng lượng ước tính 90kg', 'Phát hiện tại Thanh Hóa năm 1902'],
  },
  {
    id: '2',
    museumId: 'm4',
    title: 'Tượng Phật Đồng Dương',
    era: 'Thế kỷ IX',
    category: 'Điêu khắc',
    origin: 'Quảng Nam',
    material: 'Đá sa thạch',
    description:
      'Tượng Phật Đồng Dương là kiệt tác điêu khắc Champa, được khai quật tại khu phế tích Đồng Dương, Quảng Nam. Tượng thể hiện phong cách nghệ thuật đặc trưng của vương quốc Champa thế kỷ IX với những đường nét tinh tế và biểu cảm sâu sắc.',
    arAvailable: false,
    emoji: '🗿',
    color: '#6D28D9',
    audioUrl: DEMO_AUDIO,
    audioDuration: 90,
    transcript: [
      'Tượng Phật Đồng Dương là kiệt tác điêu khắc của vương quốc Champa, được khai quật năm 1901 tại khu phế tích Đồng Dương, tỉnh Quảng Nam.',
      'Khác với phong cách Phật giáo Ấn Độ, tượng mang nét đặc trưng riêng biệt của nghệ thuật Champa thế kỷ IX — khuôn mặt vuông vức, môi dày, tóc xoắn ốc dày đặc.',
      'Tượng cao 1,15m, được tạc từ đá sa thạch địa phương, thể hiện Đức Phật trong tư thế đứng thẳng với nụ cười bí ẩn và từ bi.',
      'Đây là một trong những tác phẩm điêu khắc Phật giáo đẹp nhất còn sót lại từ thời kỳ vàng son của Champa.',
    ],
    highlights: ['Cao 1,15m', 'Đá sa thạch Quảng Nam', 'Phong cách Đồng Dương thế kỷ IX'],
  },
  {
    id: '3',
    museumId: 'm1',
    title: 'Gốm Chu Đậu',
    era: 'Thế kỷ XIV – XV',
    category: 'Gốm sứ',
    origin: 'Hải Dương',
    material: 'Gốm men',
    description:
      'Gốm Chu Đậu là dòng gốm cao cấp được sản xuất tại làng Chu Đậu, Hải Dương. Nổi tiếng với nước men trắng ngà và họa tiết hoa lam tinh tế, gốm Chu Đậu từng được xuất khẩu sang nhiều nước châu Á và châu Âu trong thời Trung đại.',
    arAvailable: true,
    emoji: '🏺',
    color: '#0369A1',
    audioUrl: DEMO_AUDIO,
    audioDuration: 100,
    transcript: [
      'Gốm Chu Đậu ra đời tại làng Chu Đậu, huyện Nam Sách, tỉnh Hải Dương — vùng đất từng là trung tâm gốm sứ lớn nhất Đại Việt thời Trần, Lê.',
      'Điểm đặc trưng của gốm Chu Đậu là men trắng ngà tinh khiết, họa tiết hoa lam vẽ tay bằng cobalt oxide nhập từ Trung Đông.',
      'Trong thế kỷ XIV-XV, gốm Chu Đậu được xuất khẩu rộng rãi sang Nhật Bản, Triều Tiên, Ba Tư và nhiều nước châu Âu qua con đường tơ lụa trên biển.',
      'Năm 1997, một con tàu đắm thế kỷ XV được phát hiện ngoài khơi Cù Lao Chàm, Hội An chứa hơn 240.000 hiện vật gốm Chu Đậu.',
    ],
    highlights: ['Men trắng ngà đặc trưng', 'Xuất khẩu sang 40+ quốc gia', 'Phục dựng từ tàu đắm Cù Lao Chàm'],
  },
  {
    id: '4',
    museumId: 'm1',
    title: 'Kiếm thời Trần',
    era: 'Thế kỷ XIII – XIV',
    category: 'Vũ khí',
    origin: 'Miền Bắc Việt Nam',
    material: 'Sắt rèn',
    description:
      'Kiếm thời Trần là vũ khí chiến đấu của quân đội nhà Trần trong ba lần kháng chiến chống Nguyên Mông. Lưỡi kiếm được rèn từ sắt chất lượng cao, cán bọc da hoặc gỗ quý.',
    arAvailable: false,
    emoji: '⚔️',
    color: '#4B5563',
    audioUrl: DEMO_AUDIO,
    audioDuration: 80,
    transcript: [
      'Kiếm thời Trần gắn liền với ba lần đại thắng quân Nguyên Mông — một trong những đội quân hùng mạnh nhất lịch sử nhân loại.',
      'Lưỡi kiếm được rèn bằng phương pháp cuộn gấp thép nhiều lần, tạo nên sức bền và độ sắc bén đặc biệt.',
      'Cán kiếm thường được chạm khắc hình rồng hoặc phượng — biểu tượng quyền uy của tướng lĩnh nhà Trần.',
    ],
    highlights: ['Dài 85cm', 'Sắt rèn thủ công', 'Kháng chiến chống Nguyên Mông'],
  },
  {
    id: '5',
    museumId: 'm1',
    title: 'Vòng đeo tay vàng Óc Eo',
    era: 'Thế kỷ I – VII',
    category: 'Trang sức',
    origin: 'An Giang',
    material: 'Vàng ròng',
    description:
      'Vòng đeo tay vàng Óc Eo là hiện vật tiêu biểu của nền văn hóa Óc Eo — vương quốc Phù Nam cổ đại. Được làm từ vàng ròng với kỹ thuật chạm khắc tinh tế, đây là bằng chứng về sự giao thương sầm uất của Phù Nam với Ấn Độ và La Mã.',
    arAvailable: false,
    emoji: '💍',
    color: '#D97706',
    audioUrl: DEMO_AUDIO,
    audioDuration: 75,
    transcript: [
      'Vàng Óc Eo được tìm thấy tại vùng đồng bằng sông Cửu Long, dấu vết của vương quốc Phù Nam hùng mạnh từ thế kỷ I đến VII sau Công nguyên.',
      'Kỹ thuật chế tác vàng Óc Eo cho thấy sự ảnh hưởng mạnh mẽ của văn minh Ấn Độ thông qua con đường thương mại biển.',
      'Những chiếc vòng tay này không chỉ là đồ trang sức mà còn là tiền tệ và vật phẩm trao đổi trong giao thương quốc tế.',
    ],
    highlights: ['Vàng 18-22 karat', 'Phong cách Ấn Độ-Khmer', 'Khai quật tại An Giang 1944'],
  },
  {
    id: '6',
    museumId: 'm1',
    title: 'Bình gốm Lý',
    era: 'Thế kỷ XI – XIII',
    category: 'Gốm sứ',
    origin: 'Thăng Long',
    material: 'Gốm men ngọc',
    description:
      'Bình gốm thời Lý nổi tiếng với men ngọc xanh ngà tinh tế, hoa văn chạm khắc sen và rồng. Đây là đỉnh cao của nghệ thuật gốm sứ Đại Việt, thể hiện ảnh hưởng Phật giáo sâu đậm trong triều đại nhà Lý.',
    arAvailable: true,
    emoji: '🪔',
    color: '#047857',
    audioUrl: DEMO_AUDIO,
    audioDuration: 85,
    transcript: [
      'Gốm men ngọc thời Lý là thành tựu đỉnh cao của nghệ thuật gốm sứ Đại Việt, được tạo ra từ thế kỷ XI đến XIII tại kinh đô Thăng Long.',
      'Men ngọc màu xanh ngà đặc trưng được tạo nên từ hỗn hợp khoáng sản địa phương, nung ở nhiệt độ cao trong lò nung truyền thống.',
      'Hoa văn hoa sen và rồng trên gốm Lý thể hiện sâu sắc tư tưởng Phật giáo và quyền uy hoàng gia thời bấy giờ.',
    ],
    highlights: ['Men ngọc xanh ngà', 'Hoa văn sen - rồng', 'Sản xuất tại Thăng Long'],
  },
];

// ─────────────────────────────────────────────
//  IDs featured trên trang Home
// ─────────────────────────────────────────────

/** Thay đổi danh sách này để chọn hiện vật nổi bật trên Home */
export const FEATURED_IDS = ['1', '2', '3'];

// ─────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────

/** Map tra cứu nhanh theo ID */
export const EXHIBIT_MAP: Record<string, ExhibitRecord> =
  Object.fromEntries(EXHIBITS.map((e) => [e.id, e]));

export function getExhibitById(id: string): ExhibitRecord | undefined {
  return EXHIBIT_MAP[id];
}

export function getExhibitsByMuseum(museumId: string): ExhibitRecord[] {
  return EXHIBITS.filter((e) => e.museumId === museumId);
}

export function getFeaturedExhibits(): ExhibitRecord[] {
  return FEATURED_IDS.map((id) => EXHIBIT_MAP[id]).filter(Boolean) as ExhibitRecord[];
}

/** Danh sách category duy nhất, thêm "Tất cả" ở đầu */
export const EXHIBIT_CATEGORIES: string[] = [
  'Tất cả',
  ...Array.from(new Set(EXHIBITS.map((e) => e.category))),
];
