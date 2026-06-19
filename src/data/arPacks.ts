export type ARPack = {
  id: string;
  museumId: string;
  name: string;
  description: string;
  sizeMB: number;
  artifactCount: number;
  category: string;
  color: string;
  artifacts: string[];
};

export const AR_PACKS: ARPack[] = [
  // Bảo tàng Lịch sử Quốc gia (m1)
  {
    id: 'pack-m1-dongson',
    museumId: 'm1',
    name: 'Gói Văn hóa Đông Sơn',
    description: 'Bộ sưu tập 3D trống đồng, đồ đồng và trang sức thời Đông Sơn niên đại 2.500 năm.',
    sizeMB: 128,
    artifactCount: 12,
    category: 'Đồ đồng',
    color: '#D4A94D',
    artifacts: ['Trống đồng Ngọc Lũ', 'Thạp đồng Đào Thịnh', 'Rìu đồng Đông Sơn', 'Vòng tay đồng'],
  },
  {
    id: 'pack-m1-hung-vuong',
    museumId: 'm1',
    name: 'Gói Thời Hùng Vương',
    description: 'Hiện vật thời kỳ dựng nước: đồ đá, đồ gốm, vũ khí và nông cụ sơ sử Việt Nam.',
    sizeMB: 85,
    artifactCount: 8,
    category: 'Sơ sử',
    color: '#A97142',
    artifacts: ['Mũi tên đồng', 'Rìu đá', 'Gốm Phùng Nguyên', 'Hạt cườm đá'],
  },
  {
    id: 'pack-m1-phong-kien',
    museumId: 'm1',
    name: 'Gói Các vương triều',
    description: 'Gốm sứ, đồ ngự dụng và ấn tín các triều đại Lý, Trần, Lê trong lịch sử Việt Nam.',
    sizeMB: 210,
    artifactCount: 18,
    category: 'Gốm sứ',
    color: '#D4A94D',
    artifacts: ['Bát hoa lam thời Lê', 'Ấn vàng triều Nguyễn', 'Gốm men ngọc thời Lý', 'Tiền đồng cổ'],
  },

  // Bảo tàng Chứng tích Chiến tranh (m2)
  {
    id: 'pack-m2-vehicles',
    museumId: 'm2',
    name: 'Gói Phương tiện chiến tranh',
    description: 'Mô hình 3D máy bay, xe tăng, trực thăng và vũ khí sử dụng trong chiến tranh Việt Nam.',
    sizeMB: 320,
    artifactCount: 10,
    category: 'Vũ khí - Thiết bị',
    color: '#DC2626',
    artifacts: ['Máy bay F-5', 'Xe tăng M48', 'Trực thăng UH-1', 'Pháo 105mm'],
  },
  {
    id: 'pack-m2-artifacts',
    museumId: 'm2',
    name: 'Gói Hiện vật tư liệu',
    description: 'Tái hiện 3D các hiện vật lịch sử: bản đồ tác chiến, thiết bị quân sự và tài liệu mật.',
    sizeMB: 95,
    artifactCount: 15,
    category: 'Tư liệu',
    color: '#A97142',
    artifacts: ['Bản đồ chiến dịch Hồ Chí Minh', 'Máy bộ đàm PRC-25', 'Mũ sắt M1', 'Bi đông nước'],
  },

  // Bảo tàng Dân tộc học (m3)
  {
    id: 'pack-m3-nhasan',
    museumId: 'm3',
    name: 'Gói Nhà sàn truyền thống',
    description: 'Tour 3D bên trong nhà sàn của 5 dân tộc: Tày, Thái, Mường, Ê Đê và Bahnar.',
    sizeMB: 450,
    artifactCount: 5,
    category: 'Kiến trúc',
    color: '#059669',
    artifacts: ['Nhà sàn Tày', 'Nhà dài Ê Đê', 'Nhà Rông Bahnar', 'Nhà sàn Thái', 'Nhà Mường'],
  },
  {
    id: 'pack-m3-costume',
    museumId: 'm3',
    name: 'Gói Trang phục 54 dân tộc',
    description: 'Thử trang phục truyền thống của 54 dân tộc Việt Nam qua công nghệ AR.',
    sizeMB: 180,
    artifactCount: 54,
    category: 'Trang phục',
    color: '#D4A94D',
    artifacts: ['Áo dài Kinh', 'Váy thêu H\'Mông', 'Khăn Piêu Thái', 'Trang phục Chăm'],
  },

  // Bảo tàng Điêu khắc Chăm (m4)
  {
    id: 'pack-m4-shiva',
    museumId: 'm4',
    name: 'Gói Thần điện Champa',
    description: 'Tượng thần Hindu giáo của vương quốc Champa: Shiva, Vishnu, Brahma và Apsara.',
    sizeMB: 165,
    artifactCount: 14,
    category: 'Điêu khắc',
    color: '#D97706',
    artifacts: ['Tượng Shiva Mỹ Sơn', 'Tượng Vishnu', 'Vũ nữ Apsara', 'Makara'],
  },
  {
    id: 'pack-m4-myson',
    museumId: 'm4',
    name: 'Gói Thánh địa Mỹ Sơn',
    description: 'Phục dựng 3D các đài thờ và tháp Chăm tại khu di sản Mỹ Sơn.',
    sizeMB: 390,
    artifactCount: 9,
    category: 'Kiến trúc',
    color: '#A97142',
    artifacts: ['Đài thờ Trà Kiệu', 'Tháp Chăm nhóm B', 'Linga - Yoni', 'Bệ thờ Mỹ Sơn E1'],
  },

  // Bảo tàng Mỹ thuật Việt Nam (m5)
  {
    id: 'pack-m5-painting',
    museumId: 'm5',
    name: 'Gói Hội họa hiện đại',
    description: 'Bộ sưu tập tranh sơn mài, lụa và sơn dầu của danh họa Việt Nam thế kỷ XX.',
    sizeMB: 140,
    artifactCount: 20,
    category: 'Hội họa',
    color: '#7C3AED',
    artifacts: ['Thiếu nữ bên hoa huệ - Tô Ngọc Vân', 'Chơi ô ăn quan - Nguyễn Phan Chánh', 'Du kích - Nguyễn Đỗ Cung'],
  },
  {
    id: 'pack-m5-sculpture',
    museumId: 'm5',
    name: 'Gói Điêu khắc dân gian',
    description: 'Tượng gỗ, phù điêu đình làng và điêu khắc tôn giáo dân gian Bắc Bộ.',
    sizeMB: 220,
    artifactCount: 16,
    category: 'Điêu khắc',
    color: '#D4A94D',
    artifacts: ['Tượng Quan Âm nghìn tay', 'Phù điêu đình Tây Đằng', 'Tượng hổ gỗ', 'Đầu rồng gỗ'],
  },
];

export function getPacksByMuseum(museumId: string): ARPack[] {
  return AR_PACKS.filter((p) => p.museumId === museumId);
}
