import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { AnalyticsAction } from '../constants/analyticsActions';
import type { ARPack } from '../data/arPacks';
import { useLanguage } from '../i18n/LanguageContext';
import { readPackIndex, type OfflinePackRecord } from '../services/offlineCache';
import { getCachedMuseumId } from '../services/museumContext';
import { deleteOfflinePack, downloadOfflinePack } from '../services/offlineDownload';
import { loadMediaMap } from '../services/offlineMedia';
import { trackAnalytics } from '../services/trackAnalytics';

export type DownloadStatus = 'idle' | 'downloading' | 'downloaded' | 'error';

export type PackState = {
  status: DownloadStatus;
  progress: number; // 0–100
  /** Local pack is older than the newest Available package from BE. */
  updateAvailable?: boolean;
};

type PackStates = Record<string, PackState>;

function isOutdated(
  local: OfflinePackRecord | undefined,
  remote: Pick<ARPack, 'versionId' | 'checksum' | 'id'>,
): boolean {
  if (!local) return false;
  if (local.id !== remote.id) return true;
  if (
    remote.versionId != null &&
    local.versionId != null &&
    remote.versionId !== local.versionId
  ) {
    return true;
  }
  if (
    remote.checksum &&
    local.checksum &&
    remote.checksum !== local.checksum
  ) {
    return true;
  }
  return false;
}

export function useARPacks() {
  const { t } = useLanguage();
  const [packStates, setPackStates] = useState<PackStates>({});
  const [packIndex, setPackIndex] = useState<Record<string, OfflinePackRecord>>(
    {},
  );
  const inflightRef = useRef<Set<string>>(new Set());

  const reloadIndex = useCallback(async () => {
    await loadMediaMap();
    const index = await readPackIndex();
    setPackIndex(index);
    setPackStates((prev) => {
      const states: PackStates = { ...prev };
      Object.keys(index).forEach((id) => {
        states[id] = {
          status: 'downloaded',
          progress: 100,
          updateAvailable: states[id]?.updateAvailable,
        };
      });
      return states;
    });
  }, []);

  useEffect(() => {
    void reloadIndex();
  }, [reloadIndex]);

  /** Mark updateAvailable for the shown (newest) pack vs local downloads. */
  const syncUpdateFlags = useCallback((packs: ARPack[]) => {
    setPackStates((prev) => {
      const next = { ...prev };
      for (const pack of packs) {
        const local =
          packIndex[pack.id] ??
          Object.values(packIndex).find(
            (r) =>
              (pack.versionId != null && r.versionId === pack.versionId) ||
              (pack.checksum != null && r.checksum === pack.checksum),
          );
        const downloaded =
          next[pack.id]?.status === 'downloaded' || Boolean(local);
        if (!downloaded) continue;
        const updateAvailable = isOutdated(local ?? packIndex[pack.id], pack);
        next[pack.id] = {
          status: 'downloaded',
          progress: 100,
          updateAvailable,
        };
      }
      return next;
    });
  }, [packIndex]);

  const downloadPack = useCallback(
    (pack: ARPack | string) => {
      const packId = typeof pack === 'string' ? pack : pack.id;
      const meta: Partial<ARPack> = typeof pack === 'string' ? {} : pack;
      if (inflightRef.current.has(packId)) return;

      void (async () => {
        const net = await NetInfo.fetch();
        if (net.isConnected === false || net.isInternetReachable === false) {
          Alert.alert(t('common.error'), t('packs.downloadNeedNetwork'));
          return;
        }

        inflightRef.current.add(packId);
        setPackStates((prev) => ({
          ...prev,
          [packId]: { status: 'downloading', progress: 0 },
        }));

        const museumIdFromPack = meta.museumId ? Number(meta.museumId) : undefined;
        const museumId =
          Number.isFinite(museumIdFromPack) && (museumIdFromPack as number) > 0
            ? (museumIdFromPack as number)
            : getCachedMuseumId() ?? undefined;

        try {
          await downloadOfflinePack({
            packId,
            museumId: Number.isFinite(museumId) ? museumId : undefined,
            versionId: meta.versionId,
            packageUrl: meta.packageUrl,
            checksum: meta.checksum,
            onProgress: (percent) => {
              setPackStates((prev) => ({
                ...prev,
                [packId]: { status: 'downloading', progress: Math.min(percent, 99) },
              }));
            },
          });
          setPackStates((prev) => ({
            ...prev,
            [packId]: { status: 'downloaded', progress: 100, updateAvailable: false },
          }));
          // BE manager stats: AnalyticsLogs ActionType = PACKAGE_DOWNLOAD
          void trackAnalytics({
            actionType: AnalyticsAction.PACKAGE_DOWNLOAD,
            museumId: Number.isFinite(museumId) ? museumId : undefined,
          });
          await reloadIndex();
        } catch (err) {
          console.warn('Offline pack download failed:', err);
          setPackStates((prev) => ({
            ...prev,
            [packId]: { status: 'error', progress: 0 },
          }));
        } finally {
          inflightRef.current.delete(packId);
        }
      })();
    },
    [reloadIndex, t],
  );

  const deletePack = useCallback((packId: string) => {
    setPackStates((prev) => {
      const next = { ...prev };
      delete next[packId];
      return next;
    });
    void deleteOfflinePack(packId).then(() => reloadIndex());
  }, [reloadIndex]);

  const getState = useCallback(
    (packId: string): PackState =>
      packStates[packId] ?? { status: 'idle', progress: 0 },
    [packStates],
  );

  return { downloadPack, deletePack, getState, syncUpdateFlags, packIndex };
}
