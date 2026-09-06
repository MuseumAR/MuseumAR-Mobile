import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useUnityArHost } from '../../src/context/UnityArHostContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { isExpoGo, isUnityNativeAvailable } from '../../src/services/unityAr';
import { resolveArModelUrl } from '../../src/utils/arModelUrl';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

export default function ArModelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const exhibitId = parseNumericId(id);
  const { openAr: openUnityAr } = useUnityArHost();
  const { exhibit, loading: exhibitLoading } = useExhibitDetail(id);
  const { modelAsset, hasAr3d, loading: assetsLoading } = useExhibitArAssets(exhibitId);

  const modelRemoteUrl =
    modelAsset?.url || modelAsset?.assetUrl || null;

  const modelPreviewUrl =
    modelAsset?.previewImageUrl ||
    modelAsset?.markerUrl ||
    exhibit?.thumbnailUrl ||
    null;

  const loading = exhibitLoading || assetsLoading;

  const openAr = useCallback(async () => {
    if (exhibitId == null || !modelRemoteUrl) {
      Alert.alert(t('ar.title'), t('ar.noModel'));
      return;
    }

    if (isExpoGo() || !isUnityNativeAvailable()) {
      Alert.alert(t('ar.devBuildRequired'), t('ar.devBuildHint'));
      return;
    }

    const url = await resolveArModelUrl(exhibitId, modelRemoteUrl);
    if (!url) {
      Alert.alert(t('ar.title'), t('ar.noModel'));
      return;
    }

    if (__DEV__) {
      console.log('[MuseumAR] Opening Unity AR 3D:', url);
    }

    void openUnityAr(exhibitId, url);
  }, [exhibitId, modelRemoteUrl, openUnityAr, t]);

  if (loading && !exhibit) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!exhibit || !hasAr3d || !modelRemoteUrl) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('ar.noModelTitle')}</Text>
          <Text style={styles.emptyText}>{t('ar.noModelHint')}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{exhibit.title}</Text>
        <Text style={styles.subtitle}>{t('ar.previewSubtitle')}</Text>

        <View style={styles.previewCard}>
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
              <Text style={styles.modelMetaLabel}>{t('ar.modelLabel')}</Text>
              <Text style={styles.modelMetaValue}>
                {modelAsset?.format?.toUpperCase() || 'GLB'}
                {modelAsset?.fileSizeBytes
                  ? ` · ${(modelAsset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.hint}>{t('ar.openHint')}</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => void openAr()}>
          <MaterialCommunityIcons name="augmented-reality" size={22} color={C.onAccent} />
          <Text style={styles.primaryBtnText}>{t('ar.openUnity')}</Text>
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
  modelWrap: { width: '100%' },
  modelMeta: { padding: 16, borderTopWidth: 1, borderTopColor: C.divider },
  modelMetaLabel: { fontSize: 12, fontWeight: '700', color: C.accent, textTransform: 'uppercase' },
  modelMetaValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
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
