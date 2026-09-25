import * as FileSystem from 'expo-file-system/legacy';
import { unzipSync } from 'fflate';
import { rewriteRemoteImageUrl, toAbsoluteMediaUrl } from '../utils/mobileImageUrl';
import {
  apiService,
  attachExhibitRoomFields,
  type ArAssetDto,
  type ExhibitDto,
  type ExhibitionDto,
  type TourRouteDto,
} from './apiService';
import {
  ensureOfflineDirs,
  getPackExtractDir,
  markPackDownloaded,
  readCachedResponseFlexible,
  readPackIndex,
  removePackRecord,
  saveCachedResponse,
} from './offlineCache';
import {
  audioLogicalKey,
  markerLogicalKey,
  mergeMediaMap,
  modelLogicalKey,
  overlayLogicalKey,
  thumbLogicalKey,
} from './offlineMedia';

export type DownloadProgressCb = (percent: number) => void;

function resolveUrl(url?: string | null, preserveAlpha = false): string | null {
  return rewriteRemoteImageUrl(url, { preserveAlpha }) ?? null;
}

/** Models and audio must not go through the Cloudinary image transform. */
function resolveMediaUrl(url?: string | null): string | null {
  return toAbsoluteMediaUrl(url) ?? null;
}

function logicalKeysFromZipPath(relativePath: string): string[] {
  const name = relativePath.replace(/\\/g, '/');
  const keys: string[] = [];
  const audio = name.match(/audio\/exhibit_(\d+)_([a-z]+)/i);
  if (audio) keys.push(audioLogicalKey(Number(audio[1]), audio[2].toLowerCase()));
  const thumb = name.match(/images\/exhibit_(\d+)_thumb/i);
  if (thumb) keys.push(thumbLogicalKey(Number(thumb[1])));
  const overlay = name.match(/ar\/exhibit_(\d+)_overlay/i);
  if (overlay) keys.push(overlayLogicalKey(Number(overlay[1])));
  const model = name.match(/ar\/exhibit_(\d+)_model/i);
  if (model) keys.push(modelLogicalKey(Number(model[1])));
  const marker = name.match(/ar\/exhibit_(\d+)_marker/i);
  if (marker) keys.push(markerLogicalKey(Number(marker[1])));
  return keys;
}

function u8ToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63];
    out += chars[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[triple & 63] : '=';
  }
  return out;
}

function base64ToU8(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const table =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < table.length; i += 1) lookup[table.charCodeAt(i)] = i;
  const len = clean.length;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((len * 3) / 4 - padding);
  let bi = 0;
  for (let i = 0; i < len; i += 4) {
    const n =
      (lookup[clean.charCodeAt(i)] << 18) |
      (lookup[clean.charCodeAt(i + 1)] << 12) |
      (lookup[clean.charCodeAt(i + 2)] << 6) |
      lookup[clean.charCodeAt(i + 3)];
    if (bi < bytes.length) bytes[bi++] = (n >> 16) & 255;
    if (bi < bytes.length) bytes[bi++] = (n >> 8) & 255;
    if (bi < bytes.length) bytes[bi++] = n & 255;
  }
  return bytes;
}

function cacheOk<T>(data: T) {
  return {
    statusCode: 200,
    status: 'Success',
    message: '',
    data,
  };
}

function isExhibitionScope(exhibitionId?: number | null): exhibitionId is number {
  return exhibitionId != null && Number.isFinite(exhibitionId) && exhibitionId > 0;
}

/** Union exhibit lists so multiple exhibition packs stay visible offline. */
async function saveExhibitsListForOffline(
  exhibits: ExhibitDto[],
  scopeExhibitionId: number | null,
  lang?: string,
): Promise<void> {
  const key = lang ? `Content/exhibits?lang=${lang}` : 'Content/exhibits';
  if (!isExhibitionScope(scopeExhibitionId)) {
    await saveCachedResponse(key, cacheOk(exhibits));
    return;
  }

  const index = await readPackIndex();
  const packs = Object.values(index);
  const hasMuseumWide = packs.some(
    (p) => p.exhibitionId == null || p.exhibitionId === undefined,
  );

  const merged = new Map<number, ExhibitDto>();
  if (hasMuseumWide) {
    const existing = await readCachedResponseFlexible<{ data?: ExhibitDto[] }>(key);
    for (const row of existing?.data ?? []) {
      if (row?.id != null) merged.set(Number(row.id), row);
    }
  } else {
    for (const pack of packs) {
      const otherId = pack.exhibitionId;
      if (!isExhibitionScope(otherId) || otherId === scopeExhibitionId) continue;
      const otherKey = lang
        ? `Content/exhibitions/${otherId}/exhibits?lang=${lang}`
        : `Content/exhibitions/${otherId}/exhibits`;
      const other = await readCachedResponseFlexible<{ data?: ExhibitDto[] }>(otherKey);
      for (const row of other?.data ?? []) {
        if (row?.id != null) merged.set(Number(row.id), row);
      }
    }
  }

  for (const row of exhibits) {
    if (row?.id != null) merged.set(Number(row.id), row);
  }
  await saveCachedResponse(key, cacheOk([...merged.values()]));
}

async function saveExhibitionsListForOffline(
  exhibitions: ExhibitionDto[],
  scopeExhibitionId: number | null,
  lang?: string,
): Promise<void> {
  const key = lang ? `Content/exhibitions?lang=${lang}` : 'Content/exhibitions';
  if (!isExhibitionScope(scopeExhibitionId)) {
    await saveCachedResponse(key, cacheOk(exhibitions));
    return;
  }

  const scoped = exhibitions.filter((e) => Number(e.id) === scopeExhibitionId);
  const index = await readPackIndex();
  const packs = Object.values(index);
  const hasMuseumWide = packs.some(
    (p) => p.exhibitionId == null || p.exhibitionId === undefined,
  );

  if (hasMuseumWide) {
    const existing = await readCachedResponseFlexible<{ data?: ExhibitionDto[] }>(key);
    const merged = new Map<number, ExhibitionDto>();
    for (const row of existing?.data ?? []) {
      if (row?.id != null) merged.set(Number(row.id), row);
    }
    for (const row of scoped) {
      if (row?.id != null) merged.set(Number(row.id), row);
    }
    await saveCachedResponse(key, cacheOk([...merged.values()]));
    return;
  }

  const merged = new Map<number, ExhibitionDto>();
  for (const pack of packs) {
    const otherId = pack.exhibitionId;
    if (!isExhibitionScope(otherId)) continue;
    const existing = await readCachedResponseFlexible<{ data?: ExhibitionDto[] }>(key);
    for (const row of existing?.data ?? []) {
      if (Number(row.id) === otherId) merged.set(otherId, row);
    }
  }
  for (const row of scoped) {
    if (row?.id != null) merged.set(Number(row.id), row);
  }
  await saveCachedResponse(key, cacheOk([...merged.values()]));
}

/**
 * Snapshot APIs used offline.
 * Museum-wide pack → full museum content.
 * Exhibition pack → only that exhibition’s exhibits (+ shared maps/rooms/graph).
 */
async function snapshotContentApis(
  museumId?: number,
  exhibitionId?: number | null,
): Promise<ExhibitDto[]> {
  const scoped = isExhibitionScope(exhibitionId) ? exhibitionId : null;

  const sharedJobs: Array<{ key: string; run: () => Promise<unknown> }> = [
    { key: 'Content/themes', run: () => apiService.getThemes() },
    { key: 'Content/themes?lang=en', run: () => apiService.getThemes('en') },
    { key: 'Content/tags', run: () => apiService.getTags() },
    { key: 'Content/tags?lang=en', run: () => apiService.getTags('en') },
    { key: 'Content/tag-groups', run: () => apiService.getTagGroups() },
    { key: 'Content/categories', run: () => apiService.getCategories() },
    { key: 'Content/maps', run: () => apiService.getMaps('vi') },
    { key: 'Content/maps?lang=en', run: () => apiService.getMaps('en') },
    { key: 'Admin/museum-profile', run: () => apiService.getMuseumProfile() },
    { key: 'Admin/museum-profile?lang=en', run: () => apiService.getMuseumProfile('en') },
  ];

  if (!scoped) {
    sharedJobs.push(
      { key: 'Content/packages', run: () => apiService.getPackages(undefined, 'vi') },
      { key: 'Content/packages?lang=en', run: () => apiService.getPackages(undefined, 'en') },
    );
  } else {
    sharedJobs.push({
      key: `Content/packages?exhibitionId=${scoped}`,
      run: () => apiService.getPackages(scoped, 'vi'),
    });
  }

  if (museumId) {
    sharedJobs.push(
      {
        key: `Content/rooms/museum/${museumId}`,
        run: () => apiService.getRoomsByMuseum(museumId),
      },
      {
        key: `Content/rooms/museum/${museumId}?lang=vi`,
        run: () => apiService.getRoomsByMuseum(museumId, 'vi'),
      },
      {
        key: `Content/rooms/museum/${museumId}?lang=en`,
        run: () => apiService.getRoomsByMuseum(museumId, 'en'),
      },
      {
        key: `Navigation/museum/${museumId}/graph`,
        run: () => apiService.getNavigationGraph(museumId),
      },
    );
  }

  for (const job of sharedJobs) {
    try {
      const result = await job.run();
      await saveCachedResponse(job.key, result);
    } catch {
      // keep going — partial snapshot is still useful
    }
  }

  let exhibits: ExhibitDto[] = [];
  let exhibitsEn: ExhibitDto[] = [];
  let exhibitions: ExhibitionDto[] = [];
  let exhibitionsEn: ExhibitionDto[] = [];

  try {
    if (scoped) {
      const [viRes, enRes, defRes] = await Promise.all([
        apiService.getExhibitsByExhibition(scoped, 'vi'),
        apiService.getExhibitsByExhibition(scoped, 'en'),
        apiService.getExhibitsByExhibition(scoped),
      ]);
      exhibits = defRes.data?.length ? defRes.data : (viRes.data ?? []);
      exhibitsEn = enRes.data ?? exhibits;
      await saveCachedResponse(
        `Content/exhibitions/${scoped}/exhibits`,
        cacheOk(exhibits),
      );
      await saveCachedResponse(
        `Content/exhibitions/${scoped}/exhibits?lang=vi`,
        cacheOk(viRes.data ?? exhibits),
      );
      await saveCachedResponse(
        `Content/exhibitions/${scoped}/exhibits?lang=en`,
        cacheOk(exhibitsEn),
      );
      await saveExhibitsListForOffline(exhibits, scoped);
      await saveExhibitsListForOffline(viRes.data ?? exhibits, scoped, 'vi');
      await saveExhibitsListForOffline(exhibitsEn, scoped, 'en');
    } else {
      const [defRes, viRes, enRes] = await Promise.all([
        apiService.getContentExhibits(),
        apiService.getContentExhibits('vi'),
        apiService.getContentExhibits('en'),
      ]);
      exhibits = defRes.data?.length ? defRes.data : (viRes.data ?? []);
      exhibitsEn = enRes.data ?? exhibits;
      await saveExhibitsListForOffline(exhibits, null);
      await saveExhibitsListForOffline(viRes.data ?? exhibits, null, 'vi');
      await saveExhibitsListForOffline(exhibitsEn, null, 'en');
    }
  } catch {
    // exhibits optional if ZIP still has media
  }

  try {
    const [viEx, enEx] = await Promise.all([
      apiService.getExhibitions(),
      apiService.getExhibitions('en'),
    ]);
    exhibitions = viEx.data ?? [];
    exhibitionsEn = enEx.data ?? exhibitions;
    await saveExhibitionsListForOffline(exhibitions, scoped);
    await saveExhibitionsListForOffline(exhibitionsEn, scoped, 'en');
  } catch {
    // exhibitions optional
  }

  if (scoped) {
    try {
      await apiService.getExhibitionTranslations(scoped);
    } catch {
      // ignore
    }
  } else {
    for (const row of exhibitions) {
      const id = Number(row.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      try {
        await apiService.getExhibitsByExhibition(id);
        await apiService.getExhibitsByExhibition(id, 'en');
        await apiService.getExhibitionTranslations(id);
      } catch {
        // ignore per-exhibition failures
      }
    }
  }

  const exhibitIdSet = new Set(
    exhibits.map((e) => Number(e.id)).filter((id) => Number.isFinite(id) && id > 0),
  );

  let routeIds: number[] = [];
  try {
    const routesRes = await apiService.getRoutes();
    const allRoutes = routesRes.data ?? [];
    if (!scoped) {
      await saveCachedResponse('Content/routes', routesRes);
      routeIds = allRoutes
        .map((r) => Number(r.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      for (const routeId of routeIds) {
        try {
          await apiService.getRouteById(routeId);
        } catch {
          // ignore
        }
      }
    } else {
      const kept: TourRouteDto[] = [];
      for (const route of allRoutes) {
        const id = Number(route.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        try {
          const full = await apiService.getRouteById(id);
          const data = full.data;
          if (!data) continue;
          const stops = data.stops ?? [];
          if (
            stops.length > 0 &&
            stops.every((s) => exhibitIdSet.has(Number(s.exhibitId)))
          ) {
            kept.push(data);
          }
        } catch {
          // ignore per-route failures
        }
      }
      await saveCachedResponse('Content/routes', cacheOk(kept));
      routeIds = kept.map((r) => Number(r.id));
    }
  } catch {
    // routes optional
  }

  const enriched: ExhibitDto[] = [];
  for (const dto of exhibits) {
    try {
      const full = await apiService.enrichExhibit(dto);
      try {
        await apiService.getExhibitDetail(dto.id);
        await apiService.getExhibitDetail(dto.id, 'en');
        await apiService.getExhibitArAssets(dto.id);
      } catch {
        // detail/assets optional
      }
      enriched.push(full);
      await saveCachedResponse(`Content/exhibits/${dto.id}`, cacheOk(full));
      await saveCachedResponse(`Content/exhibits/${dto.id}?lang=en`, cacheOk(full));
    } catch {
      enriched.push(dto);
    }
  }
  return enriched;
}

async function downloadFile(url: string, dest: string, onRatio?: (r: number) => void): Promise<boolean> {
  try {
    const task = FileSystem.createDownloadResumable(
      url,
      dest,
      {},
      (progress) => {
        if (!onRatio) return;
        const total = progress.totalBytesExpectedToWrite;
        if (total > 0) onRatio(progress.totalBytesWritten / total);
      },
    );
    const result = await task.downloadAsync();
    return Boolean(result?.uri);
  } catch {
    return false;
  }
}

async function unzipPack(zipPath: string, extractDir: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const b64 = await FileSystem.readAsStringAsync(zipPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const unzipped = unzipSync(base64ToU8(b64));
  await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });

  for (const [relative, bytes] of Object.entries(unzipped)) {
    if (!bytes || relative.endsWith('/')) continue;
    const dest = `${extractDir}${relative.replace(/\\/g, '/')}`;
    const destDir = dest.slice(0, dest.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    await FileSystem.writeAsStringAsync(dest, u8ToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uri = dest.startsWith('file://') ? dest : `file://${dest}`;
    for (const key of logicalKeysFromZipPath(relative)) {
      map[key] = uri;
    }
    map[relative.replace(/\\/g, '/')] = uri;
  }
  return map;
}

async function downloadExtraImages(
  exhibitionId?: number | null,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const mediaDir = `${FileSystem.documentDirectory}offline/media/`;
  await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
  const scoped = isExhibitionScope(exhibitionId) ? exhibitionId : null;

  const enqueue = async (url: string | null, key: string, file: string) => {
    if (!url) return;
    const ext = url.split('?')[0].split('.').pop() || 'bin';
    const dest = `${mediaDir}${file}.${ext}`;
    const ok = await downloadFile(url, dest);
    if (!ok) return;
    const uri = dest.startsWith('file://') ? dest : `file://${dest}`;
    map[key] = uri;
    map[url] = uri;
  };

  try {
    const maps = await apiService.getMaps('vi');
    for (const item of maps.data ?? []) {
      await enqueue(
        resolveUrl(item.mapImageUrl ?? item.imageUrl),
        `map:${item.id}`,
        `map_${item.id}`,
      );
    }
  } catch {
    // maps are optional offline
  }

  try {
    const profile = await apiService.getMuseumProfile();
    if (profile.data?.id) {
      await enqueue(
        resolveUrl(profile.data.thumbnailUrl ?? profile.data.logoUrl),
        `museum:${profile.data.id}`,
        `museum_${profile.data.id}`,
      );
    }
  } catch {
    // museum image optional
  }

  try {
    const exhibitions = await apiService.getExhibitions();
    for (const item of exhibitions.data ?? []) {
      if (scoped != null && Number(item.id) !== scoped) continue;
      await enqueue(
        resolveUrl(item.thumbnailUrl),
        `exhibition:${item.id}`,
        `exhibition_${item.id}`,
      );
    }
  } catch {
    // exhibition images optional
  }

  return map;
}

async function downloadExhibitMedia(exhibits: ExhibitDto[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const mediaDir = `${FileSystem.documentDirectory}offline/media/`;
  await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });

  const enqueue = async (url: string | null, key: string, file: string) => {
    if (!url || map[key]) return;
    const ext = url.split('?')[0].split('.').pop() || 'bin';
    const dest = `${mediaDir}${file}.${ext}`;
    const ok = await downloadFile(url, dest);
    if (!ok) return;
    const uri = dest.startsWith('file://') ? dest : `file://${dest}`;
    map[key] = uri;
    map[url] = uri;
  };

  for (const exhibit of exhibits) {
    await enqueue(resolveUrl(exhibit.thumbnailUrl), thumbLogicalKey(exhibit.id), `exhibit_${exhibit.id}_thumb`);
    await enqueue(
      resolveUrl(exhibit.arOverlayUrl, true),
      overlayLogicalKey(exhibit.id),
      `exhibit_${exhibit.id}_overlay`,
    );
    await enqueue(
      resolveUrl(exhibit.arMarkerUrl),
      markerLogicalKey(exhibit.id),
      `exhibit_${exhibit.id}_marker`,
    );

    for (const tr of exhibit.translations ?? []) {
      const lang = (tr.languageCode || 'vi').toLowerCase();
      await enqueue(
        resolveMediaUrl(tr.audioUrl),
        audioLogicalKey(exhibit.id, lang),
        `exhibit_${exhibit.id}_${lang}`,
      );
    }

    try {
      const assetsRes = await apiService.getExhibitArAssets(exhibit.id);
      for (const asset of assetsRes.data ?? []) {
        if (isOverlayArAsset(asset)) {
          const remote = String(asset.url ?? asset.assetUrl ?? '').trim();
          await enqueue(
            resolveUrl(remote, true),
            overlayLogicalKey(exhibit.id),
            `exhibit_${exhibit.id}_overlay`,
          );
          continue;
        }
        if (isModel3dArAsset(asset)) {
          const remote = String(asset.url ?? asset.assetUrl ?? '').trim();
          await enqueue(
            resolveMediaUrl(remote),
            modelLogicalKey(exhibit.id),
            `exhibit_${exhibit.id}_model`,
          );
        }
      }
    } catch {
      // AR asset list optional during pack build
    }
  }
  return map;
}

function isOverlayArAsset(asset: ArAssetDto): boolean {
  const type = String(asset.assetType ?? '').toLowerCase();
  if (type === 'markerimage' || type === 'marker') return false;
  if (
    type === 'overlayimage' ||
    type === 'overlay' ||
    type === 'image' ||
    type === '2d' ||
    type === 'texture'
  ) {
    return true;
  }
  const url = String(asset.url ?? asset.assetUrl ?? '');
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

function isModel3dArAsset(asset: ArAssetDto): boolean {
  const type = String(asset.assetType ?? '').toLowerCase();
  if (
    type === 'model3d' ||
    type === '3dmodel' ||
    type === 'model' ||
    type === '3d' ||
    type === 'mesh'
  ) {
    return true;
  }
  const url = String(asset.url ?? asset.assetUrl ?? '');
  return /\.(glb|gltf|usdz|fbx|obj)(\?|$)/i.test(url);
}

async function readManifestExhibits(extractDir: string): Promise<ExhibitDto[]> {
  try {
    const path = `${extractDir}manifest.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    const rawText = await FileSystem.readAsStringAsync(path);
    const json = JSON.parse(rawText) as Record<string, unknown>;
    const list = (json.Exhibits ?? json.exhibits) as unknown;
    if (!Array.isArray(list)) return [];

    const out: ExhibitDto[] = [];
    for (const item of list) {
      const raw = (item ?? {}) as Partial<ExhibitDto> & Record<string, unknown>;
      const id = Number(raw.id ?? raw.Id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const base: ExhibitDto = {
        id,
        museumId: Number(raw.museumId ?? raw.MuseumId) || 0,
        categoryId:
          raw.categoryId != null || raw.CategoryId != null
            ? Number(raw.categoryId ?? raw.CategoryId) || undefined
            : undefined,
        themeId:
          raw.themeId != null || raw.ThemeId != null
            ? Number(raw.themeId ?? raw.ThemeId) || undefined
            : undefined,
        exhibitCode: String(raw.exhibitCode ?? raw.ExhibitCode ?? '').trim() || undefined,
        qrCodeData: String(raw.qrCodeData ?? raw.QrcodeData ?? raw.QRCodeData ?? '').trim() || undefined,
        thumbnailUrl:
          String(raw.thumbnailUrl ?? raw.ThumbnailUrl ?? '').trim() || undefined,
        arOverlayUrl:
          String(
            raw.arOverlayUrl ??
              raw.AroverlayUrl ??
              raw.aroverlayUrl ??
              raw.AROverlayUrl ??
              '',
          ).trim() || undefined,
        arMarkerUrl:
          String(
            raw.arMarkerUrl ?? raw.ArmarkerUrl ?? raw.armarkerUrl ?? raw.ARMarkerUrl ?? '',
          ).trim() || undefined,
        status: String(raw.status ?? raw.Status ?? 'Published').trim() || 'Published',
        translations: Array.isArray(raw.translations)
          ? (raw.translations as ExhibitDto['translations'])
          : Array.isArray(raw.Translations)
            ? (raw.Translations as ExhibitDto['translations'])
            : [],
      };
      out.push(attachExhibitRoomFields(raw, base));
    }
    return out;
  } catch {
    return [];
  }
}

export async function downloadOfflinePack(options: {
  packId: string;
  museumId?: number;
  versionId?: number;
  exhibitionId?: number | null;
  packageUrl?: string | null;
  checksum?: string | null;
  onProgress?: DownloadProgressCb;
}): Promise<void> {
  const { packId, onProgress } = options;
  await ensureOfflineDirs();
  onProgress?.(4);

  let exhibits = await snapshotContentApis(options.museumId, options.exhibitionId);
  onProgress?.(22);

  const extractDir = getPackExtractDir(packId);
  const zipUrl = resolveUrl(options.packageUrl);
  let unzipped: Record<string, string> = {};

  if (zipUrl) {
    await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
    const zipPath = `${extractDir}package.zip`;
    const ok = await downloadFile(zipUrl, zipPath, (ratio) => {
      onProgress?.(22 + Math.round(ratio * 55));
    });
    onProgress?.(78);
    if (ok) {
      try {
        unzipped = await unzipPack(zipPath, extractDir);
      } catch (err) {
        console.warn('Unzip offline pack failed:', err);
      }
    }
  }

  // Prefer ZIP manifest exhibits so offline lists match pack counts (FE Hiện vật).
  const fromManifest = await readManifestExhibits(extractDir);
  if (fromManifest.length > 0) {
    const scoped = isExhibitionScope(options.exhibitionId) ? options.exhibitionId : null;
    if (fromManifest.length >= exhibits.length || exhibits.length === 0) {
      exhibits = fromManifest;
      await saveExhibitsListForOffline(exhibits, scoped);
      await saveExhibitsListForOffline(exhibits, scoped, 'vi');
      await saveExhibitsListForOffline(exhibits, scoped, 'en');
      if (scoped) {
        await saveCachedResponse(
          `Content/exhibitions/${scoped}/exhibits`,
          cacheOk(exhibits),
        );
        await saveCachedResponse(
          `Content/exhibitions/${scoped}/exhibits?lang=vi`,
          cacheOk(exhibits),
        );
        await saveCachedResponse(
          `Content/exhibitions/${scoped}/exhibits?lang=en`,
          cacheOk(exhibits),
        );
      }
      for (const dto of exhibits) {
        await saveCachedResponse(`Content/exhibits/${dto.id}`, cacheOk(dto));
        await saveCachedResponse(`Content/exhibits/${dto.id}?lang=en`, cacheOk(dto));
      }
    }
  }

  onProgress?.(86);
  const downloadedMedia = await downloadExhibitMedia(exhibits);
  const extraImages = await downloadExtraImages(options.exhibitionId);
  const mediaMap = { ...unzipped, ...downloadedMedia, ...extraImages };
  await mergeMediaMap(mediaMap);
  onProgress?.(96);

  if (
    exhibits.length === 0 &&
    Object.keys(unzipped).length === 0 &&
    Object.keys(downloadedMedia).length === 0
  ) {
    throw new Error('Could not download offline content. Check your connection and try again.');
  }

  await markPackDownloaded({
    id: packId,
    museumId: options.museumId,
    versionId: options.versionId,
    exhibitionId: options.exhibitionId ?? null,
    checksum: options.checksum,
    packageUrl: options.packageUrl,
    downloadedAt: new Date().toISOString(),
    extractDir,
  });
  onProgress?.(100);
}

export async function deleteOfflinePack(packId: string): Promise<void> {
  const dir = getPackExtractDir(packId);
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
  } catch {
    // ignore
  }
  await removePackRecord(packId);
}
