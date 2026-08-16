import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { AnalyticsAction } from '../../src/constants/analyticsActions';
import { parseQRCode } from '../../src/data/qrData';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useVisitorLocation } from '../../src/context/VisitorLocationContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { apiService } from '../../src/services/apiService';
import { canUseOfflineContent, isGuestSession } from '../../src/services/offlineMode';
import { getVisitorId } from '../../src/services/sessionStorage';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

export default function ScanScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { track } = useTrackAction();
  const { setLocationFromScan } = useVisitorLocation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [resolving, setResolving] = useState(false);

  const rememberRoom = useCallback(
    async (exhibitId: number, scannedRoomId?: number | null, scanned?: {
      roomName?: string | null;
      roomCode?: string | null;
      floorNumber?: number | null;
    }) => {
      if (scannedRoomId != null && scannedRoomId > 0) {
        setLocationFromScan({
          roomId: scannedRoomId,
          roomName: scanned?.roomName,
          roomCode: scanned?.roomCode,
          floorNumber: scanned?.floorNumber,
          exhibitId,
        });
        return;
      }
      try {
        const detail = await apiService.getExhibitDetail(exhibitId, lang);
        setLocationFromScan({
          roomId: detail.data?.roomId,
          roomName: detail.data?.roomName,
          roomCode: detail.data?.roomCode,
          floorNumber: detail.data?.floorNumber,
          exhibitId,
        });
      } catch {
        // Scan still opens the exhibit even if the room cannot be resolved.
      }
    },
    [lang, setLocationFromScan],
  );

  const openExhibit = useCallback(
    (exhibitId: number) => {
      track({
        actionType: AnalyticsAction.QR_SCAN,
        exhibitId,
        languageUsed: lang,
      });
      setScanning(false);
      setResolving(false);
      router.push(`/exhibit/${exhibitId}?fromScan=1`);
    },
    [router, track],
  );

  const showInvalid = useCallback(
    (raw: string) => {
      setResolving(false);
      Alert.alert(
        t('scan.invalidQr'),
        `${t('scan.invalidQr')}:\n${raw.slice(0, 120)}`,
        [
          {
            text: t('scan.rescan'),
            onPress: () => setScanned(false),
          },
        ],
      );
    },
    [t],
  );

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || resolving) return;
      setScanned(true);

      const raw = data.trim();
      const local = parseQRCode(raw);

      // Museum deep links stay client-side (BE scan-qr is exhibit-only).
      if (local.type === 'museum') {
        setScanning(false);
        router.push(`/museum/${local.id}`);
        return;
      }

      setResolving(true);
      try {
        const net = await NetInfo.fetch();
        const offline = net.isConnected === false || net.isInternetReachable === false;
        const guestOffline = offline && (await canUseOfflineContent());

        if (offline && !guestOffline) {
          Alert.alert(
            t('scan.offlineBlocked'),
            (await isGuestSession())
              ? t('common.offlineNeedPack')
              : t('common.offlineSignedIn'),
            [{ text: t('scan.rescan'), onPress: () => setScanned(false) }],
          );
          setResolving(false);
          return;
        }

        if (!guestOffline) {
          // Newest WebBE: GET /Content/exhibits/scan-qr
          // Matches exact QrcodeData (MUSEUM_EX_…), ExhibitCode, or numeric Id.
          const visitorId = await getVisitorId();
          const response = await apiService.scanExhibitQr({
            qrData: raw,
            lang,
            visitorId,
          });
          const exhibitId = response.data?.exhibitId;
          if (exhibitId != null && exhibitId > 0) {
            await rememberRoom(exhibitId, response.data?.roomId, {
              roomName: response.data?.roomName,
              roomCode: response.data?.roomCode,
              floorNumber: response.data?.floorNumber,
            });
            openExhibit(exhibitId);
            return;
          }
        }
      } catch {
        // Fall through to local parse (offline / deep-link payloads).
      }

      // Offline / deep-link fallback: MUSEUM_EX_{id}_…, museumar://exhibit/…, numeric id
      if (local.type === 'exhibit') {
        const exhibitId = parseNumericId(local.id);
        if (exhibitId != null) {
          await rememberRoom(exhibitId);
          openExhibit(exhibitId);
          return;
        }
      }

      showInvalid(raw);
    },
    [scanned, resolving, router, lang, openExhibit, showInvalid, rememberRoom, t],
  );

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.hint}>{t('scan.checkingPermission')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.title}>{t('scan.needPermission')}</Text>
          <Text style={styles.subtitle}>{t('scan.needPermissionHint')}</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={requestPermission}>
            <Text style={styles.scanBtnText}>{t('scan.allowCamera')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('scan.title')}</Text>
        <Text style={styles.subtitle}>{t('scan.subtitle')}</Text>

        <View style={styles.cameraWrap}>
          {scanning ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned || resolving ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View style={styles.cameraOff}>
              <Text style={styles.cameraHint}>{t('scan.cameraOff')}</Text>
              <Text style={styles.cameraSubHint}>{t('scan.cameraOffHint')}</Text>
            </View>
          )}

          <View style={styles.scanFrame} pointerEvents="none">
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {resolving ? (
            <View style={styles.resolvingOverlay} pointerEvents="none">
              <ActivityIndicator color={C.accent} />
              <Text style={styles.resolvingText}>{t('scan.resolving')}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnStop]}
          disabled={resolving}
          onPress={() => {
            setScanned(false);
            setResolving(false);
            setScanning((v) => !v);
          }}
        >
          <Text style={styles.scanBtnText}>
            {scanning ? t('scan.stop') : t('scan.start')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.tip}>{t('scan.tip')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '700', color: C.textPrimary },
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  hint: { color: C.textMuted, fontSize: 15 },
  cameraWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    marginTop: 32,
    overflow: 'hidden',
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  cameraOff: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    width: '70%',
    height: '70%',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: C.accent,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  cameraHint: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  cameraSubHint: { color: C.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  resolvingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 10,
  },
  resolvingText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scanBtn: {
    marginTop: 28,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  scanBtnStop: { backgroundColor: C.danger },
  scanBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 16 },
  tip: {
    marginTop: 20,
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
