import { useCallback, useEffect, useState } from 'react';
import { apiService, RoomDto } from '../services/apiService';

/** Phòng bảo tàng — GET /Content/rooms/museum/{museumId}. */
export function useRooms(museumId: number | null | undefined) {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const id = Number(museumId);
    if (!Number.isFinite(id) || id <= 0) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getRoomsByMuseum(id);
      setRooms(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phòng');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [museumId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rooms, loading, error, refresh };
}
