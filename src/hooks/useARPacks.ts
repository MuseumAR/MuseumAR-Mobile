import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { AnalyticsAction } from '../constants/analyticsActions';
import type { ARPack } from '../data/arPacks';
import { useLanguage } from '../i18n/LanguageContext';
import { readPackIndex } from '../services/offlineCache';
import { deleteOfflinePack, downloadOfflinePack } from '../services/offlineDownload';
import { loadMediaMap } from '../services/offlineMedia';
import { trackAnalytics } from '../services/trackAnalytics';

export type DownloadStatus = 'idle' | 'downloading' | 'downloaded' | 'error';

export type PackState = {
  status: DownloadStatus;
  progress: number; // 0–100
};

type PackStates = Record<string, PackState>;

export function useARPacks() {
  const { t } = useLanguage();
  const [packStates, setPackStates] = useState<PackStates>({});
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void loadMediaMap();
    readPackIndex().then((index) => {
      const states: PackStates = {};
      Object.keys(index).forEach((id) => {
        states[id] = { status: 'downloaded', progress: 100 };
      });
      setPackStates(states);
    });
  }, []);

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

        const museumId = meta.museumId ? Number(meta.museumId) : undefined;

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
            [packId]: { status: 'downloaded', progress: 100 },
          }));
          void trackAnalytics({
            actionType: AnalyticsAction.PACKAGE_DOWNLOAD,
            museumId: Number.isFinite(museumId) ? museumId : undefined,
          });
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
    [t],
  );

  const deletePack = useCallback((packId: string) => {
    setPackStates((prev) => {
      const next = { ...prev };
      delete next[packId];
      return next;
    });
    void deleteOfflinePack(packId);
  }, []);

  const getState = useCallback(
    (packId: string): PackState => packStates[packId] ?? { status: 'idle', progress: 0 },
    [packStates],
  );

  return { downloadPack, deletePack, getState };
}
