import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../src/theme/colors';

export default function ScanScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>AR Scanner</Text>
        <Text style={styles.subtitle}>
          Hướng camera vào hiện vật hoặc mã QR để khởi động trải nghiệm AR
        </Text>

        <View style={styles.cameraPlaceholder}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.cameraHint}>Camera sẽ hiển thị ở đây</Text>
          <Text style={styles.cameraSubHint}>
            (Cần thêm expo-camera để kích hoạt)
          </Text>
        </View>

        <TouchableOpacity style={styles.scanBtn}>
          <Text style={styles.scanBtnText}>Bật Camera AR</Text>
        </TouchableOpacity>

        <Text style={styles.tip}>
          Mẹo: Đảm bảo đủ ánh sáng và giữ camera ổn định khi quét
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '700', color: C.textPrimary },
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  cameraPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.border,
  },
  scanFrame: {
    position: 'absolute',
    width: '70%',
    aspectRatio: 1,
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
  cameraSubHint: { color: C.textMuted, fontSize: 12, marginTop: 6 },
  scanBtn: {
    marginTop: 28,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  scanBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 16 },
  tip: {
    marginTop: 20,
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
