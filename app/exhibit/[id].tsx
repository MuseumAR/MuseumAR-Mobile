import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getExhibitById } from '../../src/data/exhibits';
import { useBookmarks } from '../../src/hooks/useBookmarks';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useVisitedExhibits } from '../../src/hooks/useVisitedExhibits';
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
  const exhibit = getExhibitById(id ?? '1');
  const exhibitId = parseNumericId(id);
  const museumId = parseNumericId(exhibit?.museumId);

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
      actionType: 'ViewExhibit',
      exhibitId,
      museumId,
      languageUsed: 'vi',
    });
    return () => {
      const seconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
      recordVisit(exhibitId, seconds);
    };
  }, [exhibitId, museumId, track, recordVisit]);

  const handleToggleBookmark = useCallback(async () => {
    if (exhibitId == null) return;

    const result = await toggleBookmark(exhibitId);

    if (result === 'auth_required') {
      Alert.alert('Đăng nhập cần thiết', 'Vui lòng đăng nhập để lưu hiện vật.', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (result === 'failed') {
      Alert.alert('Lỗi', 'Không thể cập nhật bookmark. Vui lòng thử lại.');
      return;
    }

    if (result === 'added') {
      track({ actionType: 'Bookmark', exhibitId, museumId });
    } else if (result === 'removed') {
      track({ actionType: 'Unbookmark', exhibitId, museumId });
    }
  }, [exhibitId, museumId, toggleBookmark, track, router]);

  if (!exhibit) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Không tìm thấy hiện vật</Text>
        </View>
      </SafeAreaView>
    );
  }

  const actions: ActionItem[] = [
    {
      icon: 'ticket-outline',
      label: 'Ticket',
      onPress: () => router.push('/(tabs)/ticket'),
    },
    {
      icon: 'yin-yang',
      label: 'Artifact',
      onPress: () => router.push('/(tabs)/scan'),
    },
    {
      icon: bookmarked ? 'heart' : 'heart-outline',
      label: 'Favorite',
      onPress: handleToggleBookmark,
      active: bookmarked,
      activeColor: '#EF4444',
      loading: bookmarkChecking || bookmarkBusy,
    },
    {
      icon: 'package-variant-closed',
      label: 'Package',
      onPress: () => router.push('/ar-packs'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroCategory}>{exhibit.category}</Text>
          <Text style={styles.heroHint}>Hình ảnh hiện vật</Text>
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

          {exhibit.arAvailable && (
            <TouchableOpacity
              style={styles.arBtn}
              onPress={() => router.push('/(tabs)/scan')}
            >
              <MaterialCommunityIcons name="augmented-reality" size={22} color={C.onAccent} />
              <Text style={styles.arBtnText}>Xem mô hình AR 3D</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nguồn gốc</Text>
              <Text style={styles.infoValue}>{exhibit.origin}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Chất liệu</Text>
              <Text style={styles.infoValue}>{exhibit.material}</Text>
            </View>
          </View>

          <View style={styles.descSection}>
            <Text style={styles.descTitle}>Giới thiệu</Text>
            <Text style={styles.descText}>{exhibit.description}</Text>
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
  },
  heroCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
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
    marginBottom: 20,
    gap: 10,
  },
  arBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 16 },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoItem: {
    flex: 1,
    backgroundColor: C.bgSurface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: 6 },
  descSection: { marginTop: 4 },
  descTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  descText: { fontSize: 15, color: C.textSecondary, lineHeight: 26 },
});
