/**
 * QR code parser — dùng EXHIBIT_MAP và MUSEUM_MAP từ data trung tâm.
 *
 * Format QR:
 *   museumar://exhibit/<id>   → AR view hiện vật
 *   museumar://museum/<id>    → Chi tiết bảo tàng
 *
 * Tạo QR test tại: https://www.qr-code-generator.com
 * Ví dụ nội dung:
 *   museumar://exhibit/1   → Trống đồng Đông Sơn
 *   museumar://exhibit/3   → Gốm Chu Đậu
 *   museumar://museum/m1   → Bảo tàng Lịch sử Quốc gia
 */

import { EXHIBIT_MAP } from './exhibits';
import { MUSEUM_MAP } from './museums';

export type QRTarget =
  | { type: 'exhibit'; id: string; name: string }
  | { type: 'museum'; id: string; name: string }
  | { type: 'unknown'; raw: string };

export function parseQRCode(data: string): QRTarget {
  const match = data.match(/museumar:\/\/(exhibit|museum)\/(\w+)/);
  if (match) {
    const kind = match[1] as 'exhibit' | 'museum';
    const id = match[2];
    if (kind === 'exhibit') {
      return { type: 'exhibit', id, name: EXHIBIT_MAP[id]?.title ?? `Hiện vật #${id}` };
    }
    if (kind === 'museum') {
      return { type: 'museum', id, name: MUSEUM_MAP[id]?.name ?? `Bảo tàng #${id}` };
    }
  }
  return { type: 'unknown', raw: data };
}
