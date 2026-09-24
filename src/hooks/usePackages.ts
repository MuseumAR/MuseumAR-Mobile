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
  const isExhibition = dto.exhibitionId != null;
  const fallbackName =
    dto.packageName?.trim() ||
    (isExhibition
      ? dto.exhibitionTitle?.trim() ||
        `Gói triển lãm #${dto.exhibitionId}`
      : dto.versionId != null
        ? `Gói bảo tàng v${dto.versionId}`
        : `Gói offline #${dto.id}`);
  const fallbackDesc =
    [
      isExhibition ? 'Triển lãm' : 'Bảo tàng',
      dto.status,
      created,
    ]
      .filter(Boolean)
      .join(' · ') || 'Gói nội dung AR offline';

  return {
    id: String(dto.id),
    museumId: dto.museumId != null ? String(dto.museumId) : '',
    name: dto.name?.trim() || fallbackName,
    description: dto.description?.trim() || fallbackDesc,
    sizeMB,
    artifactCount: assetCount,
    category: isExhibition ? 'Triển lãm' : (dto.category ?? 'Bảo tàng'),
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    artifacts: [],
    packageUrl: dto.packageUrl ?? dto.downloadUrl,
    checksum: dto.checksum,
    versionId: dto.versionId,
    exhibitionId: dto.exhibitionId ?? null,
    exhibitionTitle: dto.exhibitionTitle ?? null,
    packageName: dto.packageName ?? null,
  };
}

function isAvailable(p: ContentPackageDto): boolean {
  return (p.status ?? 'Available').toLowerCase() === 'available';
}

function sortNewest(a: ContentPackageDto, b: ContentPackageDto): number {
  const va = a.versionId ?? 0;
  const vb = b.versionId ?? 0;
  if (vb !== va) return vb - va;
  const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
  const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
  return tb - ta;
}

/**
 * Newest Available pack per scope:
 * - one museum-wide (exhibitionId null)
 * - one per exhibitionId
 * Matches BE “latest Available” without collapsing exhibition packs away.
 */
export function pickLatestAvailablePerScope(
  packages: ContentPackageDto[],
): ContentPackageDto[] {
  const available = packages.filter(isAvailable);
  if (available.length === 0) return [];

  const byScope = new Map<string, ContentPackageDto[]>();
  for (const p of available) {
    const key =
      p.exhibitionId != null && p.exhibitionId > 0
        ? `ex:${p.exhibitionId}`
        : 'museum';
    const list = byScope.get(key) ?? [];
    list.push(p);
    byScope.set(key, list);
  }

  const picked: ContentPackageDto[] = [];
  for (const list of byScope.values()) {
    list.sort(sortNewest);
    picked.push(list[0]);
  }

  // Museum-wide first, then exhibition packs by title/id.
  picked.sort((a, b) => {
    const aEx = a.exhibitionId != null ? 1 : 0;
    const bEx = b.exhibitionId != null ? 1 : 0;
    if (aEx !== bEx) return aEx - bEx;
    const an = (a.exhibitionTitle || a.packageName || '').localeCompare(
      b.exhibitionTitle || b.packageName || '',
    );
    if (an !== 0) return an;
    return sortNewest(a, b);
  });

  return picked;
}

/** @deprecated use pickLatestAvailablePerScope */
export function pickLatestAvailablePackages(
  packages: ContentPackageDto[],
): ContentPackageDto[] {
  return pickLatestAvailablePerScope(packages);
}

/**
 * Visitor packs — newest Available per museum / exhibition scope.
 * Uses GET /Content/packages, falls back to latest museum pack via sync-check.
 */
export function usePackages() {
  const [raw, setRaw] = useState<ContentPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getPackages();
      const scoped = pickLatestAvailablePerScope(response.data ?? []);
      if (scoped.length > 0) {
        setRaw(scoped);
        return;
      }

      // Empty list — still try museum-wide latest endpoint.
      const latest = await apiService.getLatestPackage();
      setRaw(latest.data ? [latest.data] : []);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setRaw([]);
        setError(null);
        return;
      }
      try {
        const latest = await apiService.getLatestPackage();
        setRaw(latest.data ? [latest.data] : []);
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
