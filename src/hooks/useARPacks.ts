import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PATH = FileSystem.documentDirectory + 'ar_packs.json';

export type DownloadStatus = 'idle' | 'downloading' | 'downloaded' | 'error';

export type PackState = {
  status: DownloadStatus;
  progress: number; // 0–100
};

type PackStates = Record<string, PackState>;

async function readStorage(): Promise<Record<string, boolean>> {
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(STORAGE_PATH);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStorage(data: Record<string, boolean>) {
  try {
    await FileSystem.writeAsStringAsync(STORAGE_PATH, JSON.stringify(data));
  } catch {
    // bỏ qua lỗi ghi file
  }
}

export function useARPacks() {
  const [packStates, setPackStates] = useState<PackStates>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Load trạng thái đã lưu khi mount
  useEffect(() => {
    readStorage().then((saved) => {
      const states: PackStates = {};
      Object.keys(saved).forEach((id) => {
        if (saved[id]) {
          states[id] = { status: 'downloaded', progress: 100 };
        }
      });
      setPackStates(states);
    });
  }, []);

  const persistDownloaded = useCallback(async (packId: string, downloaded: boolean) => {
    const saved = await readStorage();
    saved[packId] = downloaded;
    await writeStorage(saved);
  }, []);

  // Bắt đầu tải — simulate progress từng 300ms
  const downloadPack = useCallback(
    (packId: string) => {
      setPackStates((prev) => ({
        ...prev,
        [packId]: { status: 'downloading', progress: 0 },
      }));

      let progress = 0;
      const timer = setInterval(() => {
        progress += Math.floor(Math.random() * 12) + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(timer);
          delete timersRef.current[packId];
          setPackStates((prev) => ({
            ...prev,
            [packId]: { status: 'downloaded', progress: 100 },
          }));
          persistDownloaded(packId, true);
        } else {
          setPackStates((prev) => ({
            ...prev,
            [packId]: { status: 'downloading', progress },
          }));
        }
      }, 300);

      timersRef.current[packId] = timer;
    },
    [persistDownloaded],
  );

  // Xoá pack đã tải
  const deletePack = useCallback(
    (packId: string) => {
      if (timersRef.current[packId]) {
        clearInterval(timersRef.current[packId]);
        delete timersRef.current[packId];
      }
      setPackStates((prev) => {
        const next = { ...prev };
        delete next[packId];
        return next;
      });
      persistDownloaded(packId, false);
    },
    [persistDownloaded],
  );

  const getState = useCallback(
    (packId: string): PackState => packStates[packId] ?? { status: 'idle', progress: 0 },
    [packStates],
  );

  // Dọn timer khi unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  return { downloadPack, deletePack, getState };
}
