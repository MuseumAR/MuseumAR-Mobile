import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExhibitArAssets } from '../../src/hooks/useExhibitArAssets';
import { useExhibitDetail } from '../../src/hooks/useExhibitDetail';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

type ArMode = '2d' | '3d';

export default function ArModelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const exhibitId = parseNumericId(id);
  const { exhibit, loading: exhibitLoading } = useExhibitDetail(id);
  const {
    imageAsset,
    modelAsset,
    hasAr2d,
    hasAr3d,
    loading: assetsLoading,
  } = useExhibitArAssets(exhibitId);

  const availableModes = useMemo(() => {
    const modes: ArMode[] = [];
    if (hasAr2d || exhibit?.arOverlayUrl) modes.push('2d');
    if (hasAr3d) modes.push('3d');
    // Fallback: arAvailable with thumbnail as 2D preview
    if (modes.length === 0 && exhibit?.arAvailable && exhibit.thumbnailUrl) {
      modes.push('2d');
    }
    return modes;
  }, [hasAr2d, hasAr3d, exhibit]);

  const [mode, setMode] = useState<ArMode | null>(null);

  useEffect(() => {
    if (mode && availableModes.includes(mode)) return;
    setMode(availableModes[0] ?? null);
  }, [availableModes, mode]);

  const overlayUrl =
    imageAsset?.url ||
    exhibit?.arOverlayUrl ||
    (mode === '2d' ? exhibit?.thumbnailUrl : undefined) ||
    null;

  const modelPreviewUrl =
    modelAsset?.previewImageUrl ||
    modelAsset?.markerUrl ||
    exhibit?.thumbnailUrl ||
    null;

  const loading = exhibitLoading || assetsLoading;

  if (loading && !exhibit) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!exhibit || availableModes.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Chưa có mô hình AR</Text>
          <Text style={styles.emptyText}>
            Hiện vật này chưa có asset 2D overlay hoặc mô hình 3D.
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{exhibit.title}</Text>
        <Text style={styles.subtitle}>
          {mode === '2d' ? 'Xem overlay ảnh 2D' : 'Xem mô hình 3D'}
        </Text>

        {availableModes.length > 1 && (
          <View style={styles.modeRow}>
            {availableModes.includes('2d') && (
              <TouchableOpacity
                style={[styles.modeChip, mode === '2d' && styles.modeChipActive]}
                onPress={() => setMode('2d')}
              >
                <MaterialCommunityIcons
                  name="image-outline"
                  size={18}
                  color={mode === '2d' ? C.onAccent : C.accent}
                />
                <Text style={[styles.modeChipText, mode === '2d' && styles.modeChipTextActive]}>
                  AR 2D
                </Text>
              </TouchableOpacity>
            )}
            {availableModes.includes('3d') && (
              <TouchableOpacity
                style={[styles.modeChip, mode === '3d' && styles.modeChipActive]}
                onPress={() => setMode('3d')}
              >
                <MaterialCommunityIcons
                  name="cube-outline"
                  size={18}
                  color={mode === '3d' ? C.onAccent : C.accent}
                />
                <Text style={[styles.modeChipText, mode === '3d' && styles.modeChipTextActive]}>
                  AR 3D
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.previewCard}>
          {mode === '2d' ? (
            overlayUrl ? (
              <Image source={{ uri: overlayUrl }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <View style={styles.previewEmpty}>
                <MaterialCommunityIcons name="image-off-outline" size={40} color={C.textMuted} />
                <Text style={styles.previewEmptyText}>Không có ảnh overlay</Text>
              </View>
            )
          ) : (
            <View style={styles.modelWrap}>
              {modelPreviewUrl ? (
                <Image
                  source={{ uri: modelPreviewUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewEmpty}>
                  <MaterialCommunityIcons name="cube-outline" size={48} color={C.accent} />
                </View>
              )}
              <View style={styles.modelMeta}>
                <Text style={styles.modelMetaLabel}>Mô hình 3D</Text>
                <Text style={styles.modelMetaValue}>
                  {modelAsset?.format?.toUpperCase() || 'MODEL'}
                  {modelAsset?.fileSizeBytes
                    ? ` · ${(modelAsset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                    : ''}
                </Text>
                {modelAsset?.url ? (
                  <Text style={styles.modelUrl} numberOfLines={2}>
                    {modelAsset.url}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.hint}>
          {mode === '2d'
            ? 'Ảnh overlay 2D sẽ được đặt lên mặt phẳng (Ground Plane) khi mở trải nghiệm AR.'
            : 'Mô hình 3D sẽ được đặt lên mặt phẳng khi mở trải nghiệm AR (Unity / Vuforia).'}
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <MaterialCommunityIcons name="augmented-reality" size={22} color={C.onAccent} />
          <Text style={styles.primaryBtnText}>
            {mode === '2d' ? 'Mở AR với overlay 2D' : 'Mở AR với mô hình 3D'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  subtitle: { fontSize: 14, color: C.textSecondary, marginTop: 6, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bgSurface,
  },
  modeChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  modeChipText: { fontSize: 13, fontWeight: '700', color: C.accent },
  modeChipTextActive: { color: C.onAccent },
  previewCard: {
    backgroundColor: C.bgSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: 300, backgroundColor: C.bgElevated },
  previewEmpty: {
    height: 280,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  previewEmptyText: { color: C.textMuted, fontSize: 14 },
  modelWrap: { width: '100%' },
  modelMeta: { padding: 16, borderTopWidth: 1, borderTopColor: C.divider },
  modelMetaLabel: { fontSize: 12, fontWeight: '700', color: C.accent, textTransform: 'uppercase' },
  modelMetaValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  modelUrl: { fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 16 },
  hint: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryBtnText: { color: C.textSecondary, fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },
});
