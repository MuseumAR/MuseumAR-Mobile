import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { ARPackCard } from '../../src/components/ARPackCard';
import { AnalyticsAction } from '../../src/constants/analyticsActions';
import { useARPacks } from '../../src/hooks/useARPacks';
import { useBookmarks } from '../../src/hooks/useBookmarks';
import { useExhibitArAssets } from '../../src/hooks/useExhibitArAssets';
import { useExhibitDetail } from '../../src/hooks/useExhibitDetail';
import { usePackages } from '../../src/hooks/usePackages';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useVisitedExhibits } from '../../src/hooks/useVisitedExhibits';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

type ActionItem = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  loading?: boolean;
};

export default function ExhibitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { exhibit, loading: exhibitLoading } = useExhibitDetail(id);
  const exhibitId = parseNumericId(id);
  const museumId = parseNumericId(exhibit?.museumId);
  const { hasAr, hasAudio, audioAsset } = useExhibitArAssets(exhibitId);
  const arAvailable = hasAr || Boolean(exhibit?.arAvailable);
  const audioAvailable =
    hasAudio || Boolean(audioAsset?.url) || Boolean(exhibit?.audioUrl?.trim());
  const { packs, loading: packsLoading } = usePackages();
  const { downloadPack, deletePack, getState } = useARPacks();

  const {
    isBookmarked,
    toggleBookmark,
    refresh: refreshBookmarks,
    togglingId,
    hasLoaded: bookmarksLoaded,
  } = useBookmarks();
  const { recordVisit } = useVisitedExhibits();
  const { track } = useTrackAction();
  const mountTimeRef = useRef(Date.now());

  const exhibitPacks = useMemo(() => {
    if (museumId == null) return packs;
    return packs.filter((p) => !p.museumId || p.museumId === String(museumId));
  }, [packs, museumId]);

  const bookmarked = exhibitId != null && isBookmarked(exhibitId);
  const bookmarkBusy = exhibitId != null && togglingId === exhibitId;
  const bookmarkChecking = !bookmarksLoaded || bookmarkBusy;

  useFocusEffect(
    useCallback(() => {
      refreshBookmarks();
    }, [refreshBookmarks]),
  );

  useEffect(() => {
    if (exhibitId == null) return;
    mountTimeRef.current = Date.now();
    track({
      actionType: AnalyticsAction.EXHIBIT_VIEW,
      exhibitId,
      museumId,
      languageUsed: lang,
    });
    return () => {
      const seconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
      recordVisit(exhibitId, seconds);
    };
  }, [exhibitId, museumId, track, recordVisit, lang]);

  const handleToggleBookmark = useCallback(async () => {
    if (exhibitId == null) return;

    const result = await toggleBookmark(exhibitId);

    if (result === 'auth_required') {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredBookmark'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (result === 'failed') {
      Alert.alert(t('exhibit.error'), t('exhibit.bookmarkError'));
      return;
    }

    if (result === 'added') {
      track({ actionType: AnalyticsAction.BOOKMARK_ADD, exhibitId, museumId });
    } else if (result === 'removed') {
      track({
        actionType: AnalyticsAction.BOOKMARK_REMOVE,
        exhibitId,
        museumId,
      });
    }
  }, [exhibitId, museumId, toggleBookmark, track, router, t]);

  if (!exhibit) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.notFound}>
          {exhibitLoading ? (
            <ActivityIndicator color={C.accent} />
          ) : (
            <Text style={styles.notFoundText}>{t('exhibit.notFound')}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const actions: ActionItem[] = [
    {
      icon: 'ticket-outline',
      label: t('exhibit.ticket'),
      onPress: () => router.push('/(tabs)/ticket'),
    },
    {
      icon: 'line-scan',
      label: t('exhibit.arScan'),
      onPress: () => router.push('/(tabs)/scan'),
    },
    {
      icon: bookmarked ? 'heart' : 'heart-outline',
      label: t('exhibit.favorite'),
      onPress: handleToggleBookmark,
      active: bookmarked,
      activeColor: '#EF4444',
      loading: bookmarkChecking || bookmarkBusy,
    },
    {
      icon: 'package-variant-closed',
      label: t('exhibit.package'),
      onPress: () => router.push('/ar-packs'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: exhibit.color + '18' }]}>
          {exhibit.thumbnailUrl ? (
            <Image
              source={{ uri: exhibit.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroEmoji}>{exhibit.emoji || '🏺'}</Text>
              <Text style={styles.heroHint}>{t('exhibit.noImage')}</Text>
            </View>
          )}
          {exhibit.category ? (
            <View style={styles.heroCategoryBadge}>
              <Text style={styles.heroCategory}>{exhibit.category}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{exhibit.title}</Text>
          <Text style={styles.era}>{exhibit.era}</Text>

          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={action.onPress}
                disabled={action.loading}
              >
                {action.loading ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={28}
                    color={action.active ? action.activeColor : C.accent}
                  />
                )}
                <Text style={[styles.actionLabel, action.active && { color: action.activeColor }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(arAvailable || audioAvailable) && (
            <View style={styles.ctaColumn}>
              {audioAvailable && (
                <TouchableOpacity
                  style={styles.audioBtn}
                  onPress={() => router.push(`/ar-view/${id}`)}
                >
                  <MaterialCommunityIcons name="headphones" size={22} color={C.onAccent} />
                  <Text style={styles.arBtnText}>{t('exhibit.audioGuide')}</Text>
                </TouchableOpacity>
              )}
              {arAvailable && (
                <TouchableOpacity
                  style={styles.arBtn}
                  onPress={() => router.push(`/ar-model/${id}`)}
                >
                  <MaterialCommunityIcons name="augmented-reality" size={22} color={C.onAccent} />
                  <Text style={styles.arBtnText}>{t('exhibit.viewArModel')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.descSection}>
            <Text style={styles.descTitle}>{t('exhibit.about')}</Text>
            <Text style={styles.descText}>{exhibit.description}</Text>
          </View>

          <View style={styles.packSection}>
            <View style={styles.packHeader}>
              <Text style={styles.descTitle}>{t('exhibit.arPacks')}</Text>
              <TouchableOpacity onPress={() => router.push('/ar-packs')}>
                <Text style={styles.seeAll}>{t('exhibit.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {packsLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 12 }} />
            ) : exhibitPacks.length === 0 ? (
              <Text style={styles.packEmpty}>{t('exhibit.noPacks')}</Text>
            ) : (
              exhibitPacks.map((pack) => (
                <ARPackCard
                  key={pack.id}
                  pack={pack}
                  state={getState(pack.id)}
                  onDownload={() => downloadPack(pack)}
                  onDelete={() => deletePack(pack.id)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scrollContent: { paddingBottom: 32 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: C.textMuted },
  hero: {
    width: '100%',
    height: 260,
    backgroundColor: C.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroEmoji: { fontSize: 64 },
  heroCategoryBadge: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(43,29,14,0.55)',
  },
  heroCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDF8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroHint: { color: C.textMuted, fontSize: 14 },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: C.textPrimary },
  era: { fontSize: 15, color: C.textSecondary, marginTop: 6, marginBottom: 20 },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
  },
  arBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  ctaColumn: { gap: 10, marginBottom: 20 },
  arBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 16 },
  descSection: { marginTop: 4 },
  descTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  descText: { fontSize: 15, color: C.textSecondary, lineHeight: 26 },
  packSection: { marginTop: 28 },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  seeAll: { fontSize: 13, fontWeight: '600', color: C.accent, marginBottom: 12 },
  packEmpty: { fontSize: 14, color: C.textMuted, lineHeight: 22, marginTop: 4 },
});
