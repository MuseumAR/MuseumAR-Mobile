import * as FileSystem from 'expo-file-system/legacy';
import { unzipSync } from 'fflate';
import { API_ORIGIN } from '../config/apiConfig';
import { apiService, type ExhibitDto } from './apiService';
import {
  ensureOfflineDirs,
  getPackExtractDir,
  markPackDownloaded,
  removePackRecord,
  saveCachedResponse,
} from './offlineCache';
import {
  audioLogicalKey,
  markerLogicalKey,
  mergeMediaMap,
  overlayLogicalKey,
  thumbLogicalKey,
} from './offlineMedia';

export type DownloadProgressCb = (percent: number) => void;

function resolveUrl(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_ORIGIN}${path}`;
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

async function snapshotContentApis(museumId?: number): Promise<ExhibitDto[]> {
  const jobs: Array<{ key: string; run: () => Promise<unknown> }> = [
    { key: 'Content/exhibits', run: () => apiService.getContentExhibits() },
    { key: 'Content/exhibits?lang=vi', run: () => apiService.getContentExhibits('vi') },
    { key: 'Content/exhibits?lang=en', run: () => apiService.getContentExhibits('en') },
    { key: 'Content/themes', run: () => apiService.getThemes() },
    { key: 'Content/themes?lang=en', run: () => apiService.getThemes('en') },
    { key: 'Content/tags', run: () => apiService.getTags() },
    { key: 'Content/tags?lang=en', run: () => apiService.getTags('en') },
    { key: 'Content/categories', run: () => apiService.getCategories() },
    { key: 'Content/maps', run: () => apiService.getMaps() },
    { key: 'Content/routes', run: () => apiService.getRoutes() },
    { key: 'Content/exhibitions', run: () => apiService.getExhibitions() },
    { key: 'Content/exhibitions?lang=en', run: () => apiService.getExhibitions('en') },
    { key: 'Content/packages', run: () => apiService.getPackages() },
    { key: 'Admin/museum-profile', run: () => apiService.getMuseumProfile() },
    { key: 'Admin/museum-profile?lang=en', run: () => apiService.getMuseumProfile('en') },
  ];

  if (museumId) {
    jobs.push(
      {
        key: `Content/rooms/museum/${museumId}`,
        run: () => apiService.getRoomsByMuseum(museumId),
      },
      {
        key: `Content/rooms/museum/${museumId}?lang=en`,
        run: () => apiService.getRoomsByMuseum(museumId, 'en'),
      },
    );
  }

  let exhibits: ExhibitDto[] = [];
  let exhibitionIds: number[] = [];
  for (const job of jobs) {
    try {
      const result = await job.run();
      await saveCachedResponse(job.key, result);
      if (job.key.startsWith('Content/exhibits') && result && typeof result === 'object') {
        const data = (result as { data?: ExhibitDto[] }).data;
        if (Array.isArray(data) && data.length > exhibits.length) {
          exhibits = data;
        }
      }
      if (job.key.startsWith('Content/exhibitions') && result && typeof result === 'object') {
        const data = (result as { data?: Array<{ id?: number }> }).data;
        if (Array.isArray(data)) {
          exhibitionIds = data.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
        }
      }
    } catch {
      // keep going — partial snapshot is still useful
    }
  }

  for (const exhibitionId of exhibitionIds) {
    try {
      await apiService.getExhibitsByExhibition(exhibitionId);
      await apiService.getExhibitsByExhibition(exhibitionId, 'en');
      await apiService.getExhibitionTranslations(exhibitionId);
    } catch {
      // ignore per-exhibition failures
    }
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
      await saveCachedResponse(`Content/exhibits/${dto.id}`, {
        statusCode: 200,
        status: 'Success',
        message: '',
        data: full,
      });
      await saveCachedResponse(`Content/exhibits/${dto.id}?lang=en`, {
        statusCode: 200,
        status: 'Success',
        message: '',
        data: full,
      });
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

async function downloadExtraImages(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const mediaDir = `${FileSystem.documentDirectory}offline/media/`;
  await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });

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
    const maps = await apiService.getMaps();
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

  for (const exhibit of exhibits) {
    const jobs: Array<{ url: string | null; key: string; file: string }> = [
      {
        url: resolveUrl(exhibit.thumbnailUrl),
        key: thumbLogicalKey(exhibit.id),
        file: `exhibit_${exhibit.id}_thumb`,
      },
      {
        url: resolveUrl(exhibit.arOverlayUrl),
        key: overlayLogicalKey(exhibit.id),
        file: `exhibit_${exhibit.id}_overlay`,
      },
      {
        url: resolveUrl(exhibit.arMarkerUrl),
        key: markerLogicalKey(exhibit.id),
        file: `exhibit_${exhibit.id}_marker`,
      },
    ];
    for (const tr of exhibit.translations ?? []) {
      const lang = (tr.languageCode || 'vi').toLowerCase();
      jobs.push({
        url: resolveUrl(tr.audioUrl),
        key: audioLogicalKey(exhibit.id, lang),
        file: `exhibit_${exhibit.id}_${lang}`,
      });
    }

    for (const job of jobs) {
      if (!job.url) continue;
      const ext = job.url.split('?')[0].split('.').pop() || 'bin';
      const dest = `${mediaDir}${job.file}.${ext}`;
      const ok = await downloadFile(job.url, dest);
      if (!ok) continue;
      const uri = dest.startsWith('file://') ? dest : `file://${dest}`;
      map[job.key] = uri;
      map[job.url] = uri;
    }
  }
  return map;
}

export async function downloadOfflinePack(options: {
  packId: string;
  museumId?: number;
  versionId?: number;
  packageUrl?: string | null;
  checksum?: string | null;
  onProgress?: DownloadProgressCb;
}): Promise<void> {
  const { packId, onProgress } = options;
  await ensureOfflineDirs();
  onProgress?.(4);

  const exhibits = await snapshotContentApis(options.museumId);
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

  onProgress?.(86);
  const downloadedMedia = await downloadExhibitMedia(exhibits);
  const extraImages = await downloadExtraImages();
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
