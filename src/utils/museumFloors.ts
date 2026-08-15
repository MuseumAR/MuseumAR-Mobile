import type { MuseumMapDto, RoomDto } from '../services/apiService';

export type MuseumFloor = {
  floorNumber: number;
  label: string;
  roomCount: number;
  mapId?: number;
  imageUrl?: string;
};

function asFloorNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Unique floors from Content/maps + Content/rooms (MuseumMap.FloorNumber / Room.FloorNumber). */
export function collectMuseumFloors(
  maps: MuseumMapDto[],
  rooms: RoomDto[],
  floorWord: string,
): MuseumFloor[] {
  const byNum = new Map<number, MuseumFloor>();

  const ensure = (n: number): MuseumFloor => {
    const prev = byNum.get(n);
    if (prev) return prev;
    const next: MuseumFloor = {
      floorNumber: n,
      label: `${floorWord} ${n}`,
      roomCount: 0,
    };
    byNum.set(n, next);
    return next;
  };

  for (const map of maps) {
    const n = asFloorNumber(map.floorNumber);
    if (n == null) continue;
    const row = ensure(n);
    const name = map.mapName?.trim() || map.label?.trim();
    byNum.set(n, {
      ...row,
      label: name && name.toLowerCase() !== 'floor' ? name : row.label,
      mapId: map.id,
      imageUrl: map.imageUrl ?? map.mapImageUrl,
    });
  }

  const counts = new Map<number, number>();
  for (const room of rooms) {
    const n = asFloorNumber(room.floorNumber) ?? 1;
    counts.set(n, (counts.get(n) ?? 0) + 1);
    ensure(n);
  }
  for (const [n, count] of counts) {
    const row = byNum.get(n);
    if (row) byNum.set(n, { ...row, roomCount: count });
  }

  return [...byNum.values()].sort((a, b) => a.floorNumber - b.floorNumber);
}
