import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, ArAssetDto } from '../services/apiService';

function assetTypeOf(a: ArAssetDto): string {
  return (a.assetType ?? '').toLowerCase().trim();
}

function formatOf(a: ArAssetDto): string {
  return (a.format ?? '').toLowerCase().trim();
}

function assetUrlOf(a: ArAssetDto): string {
  return (a.url || a.assetUrl || '').trim();
}

function isAudioAsset(a: ArAssetDto): boolean {
  const t = assetTypeOf(a);
  const f = formatOf(a);
  if (t === 'audio') return true;
  if (f === 'mp3' || f === 'wav' || f === 'm4a' || f === 'aac') return true;
  return /\.(mp3|wav|m4a|aac)(\?|$)/i.test(assetUrlOf(a));
}

/**
 * 2D image overlay — matches WebBE assetType OverlayImage only.
 * MarkerImage is intentionally excluded (separate marker QR / tracking asset).
 */
function isImageOverlayAsset(a: ArAssetDto): boolean {
  if (isAudioAsset(a)) return false;
  const t = assetTypeOf(a);
  if (t === 'markerimage' || t === 'marker') return false;
  if (
    t === 'overlayimage' ||
    t === 'overlay' ||
    t === 'image' ||
    t === '2d' ||
    t === 'texture'
  ) {
    return true;
  }
  // Legacy rows without assetType: treat image extensions as overlay,
  // but never when type is already known as marker/model.
  if (t) return false;
  const f = formatOf(a);
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f)) return true;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(assetUrlOf(a));
}

/**
 * 3D model — matches WebBE assetType Model3D / 3DModel
 * (also legacy: model / 3d / mesh).
 */
function isModel3dAsset(a: ArAssetDto): boolean {
  if (isAudioAsset(a) || isImageOverlayAsset(a)) return false;
  const t = assetTypeOf(a);
  const f = formatOf(a);
  if (
    t === 'model3d' ||
    t === '3dmodel' ||
    t === 'model' ||
    t === '3d' ||
    t === 'mesh'
  ) {
    return true;
  }
  if (['glb', 'gltf', 'usdz', 'fbx', 'obj', 'assetbundle'].includes(f)) return true;
  return /\.(glb|gltf|usdz|fbx|obj)(\?|$)/i.test(assetUrlOf(a));
}

/**
 * Lấy asset AR của hiện vật (GET /Content/exhibits/{id}/ar-assets).
 * Tách rõ: 2D overlay, 3D model, audio — khớp assetType WebBE.
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
