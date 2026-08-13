import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService, RoomDto } from '../services/apiService';

/** Phòng bảo tàng — GET /Content/rooms/museum/{museumId}?lang=. */
export function useRooms(museumId: number | null | undefined) {
  const { lang } = useLanguage();
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
      const response = await apiService.getRoomsByMuseum(id, lang);
      setRooms(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phòng');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [museumId, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rooms, loading, error, refresh };
}
