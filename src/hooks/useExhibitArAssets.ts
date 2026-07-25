import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, ArAssetDto } from '../services/apiService';

function assetTypeOf(a: ArAssetDto): string {
  return (a.assetType ?? '').toLowerCase().trim();
}

function formatOf(a: ArAssetDto): string {
  return (a.format ?? '').toLowerCase().trim();
}

function isAudioAsset(a: ArAssetDto): boolean {
  const t = assetTypeOf(a);
  const f = formatOf(a);
  return t === 'audio' || f === 'mp3' || f === 'wav' || f === 'm4a';
}

/** 2D image overlay for Ground Plane / Vuforia overlay. */
function isImageOverlayAsset(a: ArAssetDto): boolean {
  if (isAudioAsset(a)) return false;
  const t = assetTypeOf(a);
  const f = formatOf(a);
  if (t === 'image' || t === 'overlay' || t === '2d' || t === 'texture') return true;
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f)) return true;
  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(a.url ?? '')) return true;
  return false;
}

/** 3D model asset. */
function isModel3dAsset(a: ArAssetDto): boolean {
  if (isAudioAsset(a) || isImageOverlayAsset(a)) return false;
  const t = assetTypeOf(a);
  const f = formatOf(a);
  if (t === 'model' || t === '3d' || t === 'mesh') return true;
  if (['glb', 'gltf', 'usdz', 'fbx', 'obj', 'assetbundle'].includes(f)) return true;
  if (/\.(glb|gltf|usdz|fbx|obj)(\?|$)/i.test(a.url ?? '')) return true;
  return false;
}

/**
 * Lấy asset AR của hiện vật (GET /Content/exhibits/{id}/ar-assets).
 * Tách rõ: 2D overlay, 3D model, audio.
 */
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

  const imageAsset = useMemo(
    () => assets.find(isImageOverlayAsset) ?? null,
    [assets],
  );
  const modelAsset = useMemo(
    () => assets.find(isModel3dAsset) ?? null,
    [assets],
  );
  const audioAsset = useMemo(
    () => assets.find(isAudioAsset) ?? null,
    [assets],
  );

  const hasAr2d = Boolean(imageAsset);
  const hasAr3d = Boolean(modelAsset);
  /** Visual AR available (2D overlay and/or 3D model). */
  const hasAr = hasAr2d || hasAr3d;
  const hasAudio = Boolean(audioAsset);

  return {
    assets,
    imageAsset,
    modelAsset,
    audioAsset,
    hasAr,
    hasAr2d,
    hasAr3d,
    hasAudio,
    loading,
    error,
    refresh,
  };
}
