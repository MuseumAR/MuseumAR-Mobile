import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnityArHost } from '../context/UnityArHostContext';
import { useLanguage } from '../i18n/LanguageContext';
import { isUnityNativeAvailable } from '../services/unityAr';
import { C } from '../theme/colors';
import {
  UnityArPlayer,
  type UnityArPlayerHandle,
  type UnityArStatus,
} from './UnityArPlayer';

/**
 * Full-screen Unity overlay. After the first AR open, the native player stays
 * mounted (hidden + paused) so the next exhibit does not re-init Unity.
 */
export function UnityArHostOverlay() {
  const { t } = useLanguage();
  const { session, visible, playerMounted, closeAr } = useUnityArHost();
  const [arStatus, setArStatus] = useState<UnityArStatus>({ state: 'loading' });
  const playerRef = useRef<UnityArPlayerHandle | null>(null);
  const lastSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !session) return;
    const key = `${session.exhibitId}:${session.modelUrl}`;
    if (lastSessionKeyRef.current === key) {
      // Same exhibit reopen — keep "loaded" instead of flashing loading.
      setArStatus({ state: 'loaded' });
      return;
    }
    lastSessionKeyRef.current = key;
    setArStatus({ state: 'loading' });
  }, [visible, session?.exhibitId, session?.modelUrl]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeAr();
      return true;
    });
    return () => sub.remove();
  }, [visible, closeAr]);

  if (!playerMounted || !session) return null;

  const native = isUnityNativeAvailable();

  const handleReset = () => {
    setArStatus({ state: 'loading' });
    playerRef.current?.resetPlacement();
  };

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.host, visible ? styles.hostVisible : styles.hostHidden]}
    >
      {native ? (
        <UnityArPlayer
          ref={playerRef}
          exhibitId={session.exhibitId}
          modelUrl={session.modelUrl}
          active={visible}
          onArStatus={setArStatus}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.body}>{t('ar.unityUnavailable')}</Text>
        </View>
      )}

      {visible ? (
        <>
          <SafeAreaView style={styles.overlayBar} edges={['top']}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={closeAr}>
                <MaterialCommunityIcons name="close" size={22} color="#fff" />
                <Text style={styles.closeText}>{t('ar.close')}</Text>
              </TouchableOpacity>
              {native ? (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleReset}
                  disabled={arStatus.state === 'loading'}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
                  <Text style={styles.closeText}>{t('ar.reset')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </SafeAreaView>
          <SafeAreaView style={styles.statusBar} edges={['bottom']}>
            {arStatus.state === 'loading' && (
              <View style={styles.statusChip}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.statusText}>{t('ar.loadingModel')}</Text>
              </View>
            )}
            {arStatus.state === 'loaded' && (
              <View style={[styles.statusChip, styles.statusChipOk]}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                <Text style={styles.statusText}>{t('ar.modelReady')}</Text>
              </View>
            )}
            {arStatus.state === 'error' && (
              <View style={[styles.statusChip, styles.statusChipError]}>
                <MaterialCommunityIcons name="alert-circle" size={18} color="#fff" />
                <Text style={styles.statusText} numberOfLines={2}>
                  {arStatus.message}
                </Text>
              </View>
            )}
          </SafeAreaView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  hostVisible: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  // Keep a full-size instance off-screen. Unity uses a SurfaceView that
  // ignores opacity/zIndex, so we must not leave it covering the app.
  hostHidden: {
    top: 0,
    left: '100%',
    width: '100%',
    height: '100%',
    zIndex: -1,
    elevation: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  body: { color: '#fff', textAlign: 'center' },
  overlayBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '92%',
  },
  statusChipOk: { backgroundColor: 'rgba(22,101,52,0.85)' },
  statusChipError: { backgroundColor: 'rgba(153,27,27,0.9)' },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 13, flexShrink: 1 },
});
