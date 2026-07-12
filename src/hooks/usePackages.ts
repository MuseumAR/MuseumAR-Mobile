import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, ContentPackageDto } from '../services/apiService';
import type { ARPack } from '../data/arPacks';

const COLOR_PALETTE = ['#C89B3C', '#A67C2D', '#9A6F1F', '#B45309', '#0369A1'];

function mapPackage(dto: ContentPackageDto, index: number): ARPack {
  const sizeMB = dto.sizeBytes != null ? Math.round(dto.sizeBytes / (1024 * 1024)) : 0;
  return {
    id: String(dto.id),
    museumId: dto.museumId != null ? String(dto.museumId) : '',
    name: dto.name,
    description: dto.description ?? '',
    sizeMB,
    artifactCount: dto.exhibitCount ?? 0,
    category: dto.category ?? 'Nội dung AR',
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    artifacts: [],
  };
}

/** Lấy gói nội dung offline / AR packs (GET /Content/packages). */
export function usePackages() {
  const [raw, setRaw] = useState<ContentPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getPackages();
      setRaw(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải gói nội dung');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const packs = useMemo(() => raw.map(mapPackage), [raw]);

  return { packs, raw, loading, error, refresh };
}
