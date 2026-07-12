import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, ArAssetDto } from '../services/apiService';

/** Lấy asset AR 3D của một hiện vật (GET /Content/exhibits/{id}/ar-assets). */
export function useExhibitArAssets(exhibitId: number | null) {
  const [assets, setAssets] = useState<ArAssetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (exhibitId == null) {
      setAssets([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getExhibitArAssets(exhibitId);
      setAssets(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải asset AR');
    } finally {
      setLoading(false);
    }
  }, [exhibitId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const modelAsset = useMemo(
    () => assets.find((a) => a.assetType?.toLowerCase() === 'model') ?? assets[0] ?? null,
    [assets],
  );
  const audioAsset = useMemo(
    () => assets.find((a) => a.assetType?.toLowerCase() === 'audio') ?? null,
    [assets],
  );
  const hasAr = assets.length > 0;

  return { assets, modelAsset, audioAsset, hasAr, loading, error, refresh };
}
