import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiService, ContentPackageDto } from '../services/apiService';
import type { ARPack } from '../data/arPacks';

const COLOR_PALETTE = ['#C89B3C', '#A67C2D', '#9A6F1F', '#B45309', '#0369A1'];

function mapPackage(dto: ContentPackageDto, index: number): ARPack {
  const sizeMB = dto.sizeBytes != null ? Math.round(dto.sizeBytes / (1024 * 1024)) : 0;
  const assetCount = dto.arassetCount ?? dto.exhibitCount ?? 0;
  const created = dto.createdAt
    ? new Date(dto.createdAt).toLocaleDateString('vi-VN')
    : null;
  const fallbackName =
    dto.versionId != null ? `Gói offline v${dto.versionId}` : `Gói offline #${dto.id}`;
  const fallbackDesc = [dto.status, created].filter(Boolean).join(' · ') || 'Gói nội dung AR offline';

  return {
    id: String(dto.id),
    museumId: dto.museumId != null ? String(dto.museumId) : '',
    name: dto.name?.trim() || fallbackName,
    description: dto.description?.trim() || fallbackDesc,
    sizeMB,
    artifactCount: assetCount,
    category: dto.category ?? 'Nội dung AR',
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    artifacts: [],
    packageUrl: dto.packageUrl ?? dto.downloadUrl,
    checksum: dto.checksum,
    versionId: dto.versionId,
  };
}

/** Same rule as BE GetLatestOfflinePackageAsync — Available, newest CreatedAt / versionId. */
export function pickLatestAvailablePackages(
  packages: ContentPackageDto[],
): ContentPackageDto[] {
  const available = packages.filter((p) => {
    const status = (p.status ?? 'Available').toLowerCase();
    return status === 'available';
  });
  if (available.length === 0) return [];
  const sorted = [...available].sort((a, b) => {
    const va = a.versionId ?? 0;
    const vb = b.versionId ?? 0;
    if (vb !== va) return vb - va;
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });
  return [sorted[0]];
}

/**
 * Visitor packs list — newest Available package only.
 * Prefers GET /Visitor/sync-check; falls back to GET /Content/packages + filter.
 */
export function usePackages() {
  const [raw, setRaw] = useState<ContentPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latest = await apiService.getLatestPackage();
      if (latest.data) {
        setRaw([latest.data]);
        return;
      }

      // No dedicated latest / 404 — fall back to list and pick newest Available.
      const response = await apiService.getPackages();
      setRaw(pickLatestAvailablePackages(response.data ?? []));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setRaw([]);
        setError(null);
        return;
      }
      try {
        const response = await apiService.getPackages();
        setRaw(pickLatestAvailablePackages(response.data ?? []));
      } catch (fallbackErr: unknown) {
        setError(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : 'Không thể tải gói nội dung',
        );
        setRaw([]);
      }
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
