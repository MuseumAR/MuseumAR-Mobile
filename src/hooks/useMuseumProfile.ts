import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, MuseumProfileDto } from '../services/apiService';
import { setCachedMuseumId } from '../services/museumContext';
import { CURRENT_MUSEUM, type MuseumRecord } from '../data/museums';

/** Ghép hồ sơ bảo tàng từ backend vào MuseumRecord (giữ mock cho field BE không trả). */
function mergeProfile(profile: MuseumProfileDto | null): MuseumRecord {
  if (!profile) return CURRENT_MUSEUM;

  const ticketPriceVnd = profile.ticketPrice ?? CURRENT_MUSEUM.ticketPriceVnd;

  return {
    ...CURRENT_MUSEUM,
    id: String(profile.id),
    name: profile.name || CURRENT_MUSEUM.name,
    city: profile.city || CURRENT_MUSEUM.city,
    address: profile.address || CURRENT_MUSEUM.address,
    phone: profile.phone || profile.contactPhone || CURRENT_MUSEUM.phone,
    openHours: profile.openHours || profile.openingHours || CURRENT_MUSEUM.openHours,
    closedDay: profile.closedDay || CURRENT_MUSEUM.closedDay,
    ticketPriceVnd,
    ticketPrice: `${ticketPriceVnd.toLocaleString('vi-VN')} đ / người`,
    exhibits: profile.exhibitCount ?? CURRENT_MUSEUM.exhibits,
    founded: profile.foundedYear != null ? String(profile.foundedYear) : CURRENT_MUSEUM.founded,
    description: profile.description || CURRENT_MUSEUM.description,
    thumbnailUrl: profile.thumbnailUrl ?? profile.logoUrl,
  };
}

/**
 * Lấy hồ sơ bảo tàng (GET /Admin/museum-profile).
 * Cache museumId để track-action / visitor APIs dùng.
 */
export function useMuseumProfile() {
  const [profile, setProfile] = useState<MuseumProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getMuseumProfile();
      const data = response.data ?? null;
      setProfile(data);
      if (data?.id != null) setCachedMuseumId(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ bảo tàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const museum = useMemo(() => mergeProfile(profile), [profile]);

  return { profile, museum, loading, error, refresh };
}
