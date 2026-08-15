import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UnityArPlayer,
  UnityOverlayStatus,
} from '../../src/components/UnityArPlayer';
import { AnalyticsAction } from '../../src/constants/analyticsActions';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { isExpoGo, isUnityNativeAvailable } from '../../src/services/unityAr';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

/**
 * Full-screen Unity UaaL session for 2D image overlay AR.
 * Requires a development / release build with unity/builds exported.
 */
export default function UnityArScreen() {
  const router = useRouter();
  const { id, overlayUrl: overlayUrlParam } = useLocalSearchParams<{
    id: string;
    overlayUrl?: string | string[];
  }>();

  const exhibitId = parseNumericId(id);
  const { track } = useTrackAction();
  const { lang } = useLanguage();
  const arViewTracked = useRef(false);
  const overlayUrl = useMemo(() => {
    const raw = Array.isArray(overlayUrlParam) ? overlayUrlParam[0] : overlayUrlParam;
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  }, [overlayUrlParam]);

  const [overlayStatus, setOverlayStatus] = useState<UnityOverlayStatus>({
    state: 'loading',
  });

  const available = isUnityNativeAvailable();
  const expoGo = isExpoGo();

  useEffect(() => {
    if (arViewTracked.current || exhibitId == null || !overlayUrl || !available) {
      return;
    }
    arViewTracked.current = true;
    track({
      actionType: AnalyticsAction.AR_VIEW,
      exhibitId,
      languageUsed: lang,
    });
  }, [exhibitId, overlayUrl, available, track, lang]);

  if (exhibitId == null || !overlayUrl) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Thiếu dữ liệu AR</Text>
          <Text style={styles.body}>Cần exhibitId và overlayUrl hợp lệ.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!available) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="cube-outline" size={48} color={C.accent} />
          <Text style={styles.title}>Cần Development Build</Text>
          <Text style={styles.body}>
            {expoGo
              ? 'Expo Go không chạy được Unity. Hãy export Unity vào unity/builds rồi chạy:\nnpx expo prebuild\nnpx expo run:android'
              : 'Native Unity module chưa sẵn sàng. Export 2d_Ar vào unity/builds/android (và ios), rồi prebuild + run lại.'}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.full}>
      <UnityArPlayer
        exhibitId={exhibitId}
        overlayUrl={overlayUrl}
        onOverlayStatus={setOverlayStatus}
      />
      <SafeAreaView style={styles.overlayBar} edges={['top']}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={22} color="#fff" />
          <Text style={styles.closeText}>Đóng AR</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <SafeAreaView style={styles.statusBar} edges={['bottom']}>
        {overlayStatus.state === 'loading' && (
          <View style={styles.statusChip}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.statusText}>Đang tải ảnh overlay…</Text>
          </View>
        )}
        {overlayStatus.state === 'loaded' && (
          <View style={[styles.statusChip, styles.statusChipOk]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.statusText}>
              Ảnh đã sẵn sàng — chạm vào ô vuông để đặt
            </Text>
          </View>
        )}
        {overlayStatus.state === 'error' && (
          <View style={[styles.statusChip, styles.statusChipError]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#fff" />
            <Text style={styles.statusText} numberOfLines={2}>
              {overlayStatus.message}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  full: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: C.textPrimary, textAlign: 'center' },
  body: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnText: { color: C.onAccent, fontWeight: '700' },
  overlayBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  closeBtn: {
    alignSelf: 'flex-start',
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
