import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseQRCode } from '../../src/data/qrData';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { track } = useTrackAction();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);

      const target = parseQRCode(data);

      if (target.type === 'exhibit') {
        const exhibitId = parseNumericId(target.id);
        if (exhibitId != null) {
          track({
            actionType: 'ScanQR',
            exhibitId,
          });
        }
        setScanning(false);
        router.push(`/exhibit/${target.id}`);
        return;
      }

      if (target.type === 'museum') {
        setScanning(false);
        router.push(`/museum/${target.id}`);
        return;
      }

      Alert.alert(
        t('scan.invalidQr'),
        `${t('scan.invalidQr')}:\n${data.slice(0, 120)}`,
        [
          {
            text: t('scan.rescan'),
            onPress: () => setScanned(false),
          },
        ],
      );
    },
    [router, track, scanned, t],
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
          <Text style={styles.subtitle}>
            {t('scan.needPermissionHint')}
          </Text>
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
        <Text style={styles.subtitle}>
          {t('scan.subtitle')}
        </Text>

        <View style={styles.cameraWrap}>
          {scanning ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
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
        </View>

        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnStop]}
          onPress={() => {
            setScanned(false);
            setScanning((v) => !v);
          }}
        >
          <Text style={styles.scanBtnText}>
            {scanning ? t('scan.stop') : t('scan.start')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.tip}>
          {t('scan.tip')}
        </Text>
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
