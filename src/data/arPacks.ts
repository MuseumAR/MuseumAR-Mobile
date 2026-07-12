import { CURRENT_MUSEUM } from './museums';

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
  {
    id: 'pack-m1-dongson',
    museumId: CURRENT_MUSEUM.id,
    name: 'Gói Văn hóa Đông Sơn',
    description: 'Bộ sưu tập 3D trống đồng, đồ đồng và trang sức thời Đông Sơn niên đại 2.500 năm.',
    sizeMB: 128,
    artifactCount: 12,
    category: 'Đồ đồng',
    color: '#C89B3C',
    artifacts: ['Trống đồng Ngọc Lũ', 'Thạp đồng Đào Thịnh', 'Rìu đồng Đông Sơn', 'Vòng tay đồng'],
  },
  {
    id: 'pack-m1-hung-vuong',
    museumId: CURRENT_MUSEUM.id,
    name: 'Gói Thời Hùng Vương',
    description: 'Hiện vật thời kỳ dựng nước: đồ đá, đồ gốm, vũ khí và nông cụ sơ sử Việt Nam.',
    sizeMB: 85,
    artifactCount: 8,
    category: 'Sơ sử',
    color: '#A67C2D',
    artifacts: ['Mũi tên đồng', 'Rìu đá', 'Gốm Phùng Nguyên', 'Hạt cườm đá'],
  },
  {
    id: 'pack-m1-phong-kien',
    museumId: CURRENT_MUSEUM.id,
    name: 'Gói Các vương triều',
    description: 'Gốm sứ, đồ ngự dụng và ấn tín các triều đại Lý, Trần, Lê trong lịch sử Việt Nam.',
    sizeMB: 210,
    artifactCount: 18,
    category: 'Gốm sứ',
    color: '#C89B3C',
    artifacts: ['Bát hoa lam thời Lê', 'Ấn vàng triều Nguyễn', 'Gốm men ngọc thời Lý', 'Tiền đồng cổ'],
  },
];

export function getPacksByMuseum(museumId: string = CURRENT_MUSEUM.id): ARPack[] {
  return AR_PACKS.filter((p) => p.museumId === museumId);
}
