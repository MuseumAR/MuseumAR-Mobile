import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCategories } from '../../src/hooks/useCategories';
import { useExhibits } from '../../src/hooks/useExhibits';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { C } from '../../src/theme/colors';

const TAXONOMY_COLORS = ['#C89B3C', '#A67C2D', '#0369A1', '#047857', '#9A6F1F', '#B45309'];
const CATEGORY_ICONS = [
  'view-grid-outline',
  'home-city-outline',
  'treasure-chest',
  'palette-outline',
  'book-open-page-variant',
] as const;
const THEME_ICONS = [
  'tag-outline',
  'lightning-bolt',
  'shield-outline',
  'crown',
  'compass-outline',
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { featured: featuredExhibits } = useExhibits();
  const { museum } = useMuseumProfile();
  const { categories, themes } = useCategories();

  const quickActions = [
    { label: t('home.quickScan'), icon: 'line-scan' as const, route: '/(tabs)/scan' as const },
    { label: t('home.quickAudio'), icon: 'headphones' as const, route: '/(tabs)/explore' as const },
    { label: t('home.quickSaved'), icon: 'bookmark-outline' as const, route: '/(tabs)/profile' as const },
  ];

  const categoryCards = useMemo(
    () =>
      categories
        .filter((c) => c.name)
        .slice(0, 6)
        .map((c, i) => ({
          id: c.id,
          name: c.name as string,
          color: TAXONOMY_COLORS[i % TAXONOMY_COLORS.length],
          icon: CATEGORY_ICONS[i % CATEGORY_ICONS.length],
        })),
    [categories],
  );

  const themeCards = useMemo(
    () =>
      themes.slice(0, 6).map((theme, i) => ({
        id: theme.id,
        name: theme.name,
        color: TAXONOMY_COLORS[(i + 2) % TAXONOMY_COLORS.length],
        icon: THEME_ICONS[i % THEME_ICONS.length],
      })),
    [themes],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('home.welcome')}</Text>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{t('home.brandMuseum')}</Text>
              <Text style={[styles.headerTitle, styles.headerTitleGold]}>{t('home.brandAr')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarText}>KH</Text>
            <View style={styles.avatarBadge} />
          </TouchableOpacity>
        </View>

        {/* ── Hero Banner ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.hero}
          activeOpacity={0.93}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <View style={styles.heroBg}>
            <Text style={styles.heroBgEmoji}>🥁</Text>
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(247,242,233,0.55)', 'rgba(247,242,233,0.97)']}
            locations={[0, 0.45, 1]}
            style={styles.heroGradient}
          />

          <View style={styles.heroAccentLine} />

          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <MaterialCommunityIcons name="augmented-reality" size={12} color={C.accent} />
              <Text style={styles.heroTagText}>{t('home.heroTag')}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroSubtitle}>
              {t('home.heroSubtitle')}
            </Text>
            <View style={styles.heroCTA}>
              <LinearGradient
                colors={[C.accent, C.bronze]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroCTAGradient}
              >
                <MaterialCommunityIcons name="line-scan" size={16} color={C.onAccent} />
                <Text style={styles.heroCTAText}>{t('home.heroCta')}</Text>
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── About the Museum ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>{t('museum.about')}</Text>
              <Text style={styles.sectionTitle}>{t('museum.title')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
              <Text style={styles.seeAll}>{t('home.seeAll')} →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.museumCard}
          activeOpacity={0.88}
          onPress={() => router.push(`/museum/${museum.id}`)}
        >
          <View style={[styles.museumCardImage, { backgroundColor: museum.color + '18' }]}>
            {museum.thumbnailUrl ? (
              <Image
                source={{ uri: museum.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.museumEmoji}>🏛</Text>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(247,242,233,0.95)']}
              style={styles.museumCardGradient}
            />
          </View>

          <View style={styles.museumCardInfo}>
            {museum.tag ? (
              <View style={[styles.museumBadge, { borderColor: museum.color + '60' }]}>
                <Text style={[styles.museumBadgeText, { color: museum.color }]}>{museum.tag}</Text>
              </View>
            ) : null}
            <Text style={styles.museumName}>{museum.name}</Text>
            <View style={styles.museumLocation}>
              <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.textSecondary} />
              <Text style={styles.museumCity}>{museum.city}</Text>
            </View>
            <View style={styles.museumMetaRow}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={C.success} />
              <Text style={styles.museumHours}>{museum.openHours}</Text>
              <Text style={styles.museumDot}>·</Text>
              <Text style={styles.museumTicket}>{museum.ticketPrice}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Featured Artifacts ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>{t('museum.highlights')}</Text>
              <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>{t('home.seeAll')} →</Text>
            </TouchableOpacity>
          </View>

          {featuredExhibits.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.artifactRow}
              activeOpacity={0.85}
              onPress={() => router.push(`/exhibit/${item.id}`)}
            >
              <View style={[styles.artifactThumb, { backgroundColor: item.color + '18' }]}>
                {item.thumbnailUrl ? (
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.artifactThumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.artifactEmoji}>{item.emoji}</Text>
                )}
              </View>

              <View style={styles.artifactInfo}>
                <Text style={styles.artifactCategory}>{item.category}</Text>
                <Text style={styles.artifactTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.artifactEra}>{item.era}</Text>
              </View>

              <View style={styles.artifactRight}>
                {item.arAvailable && (
                  <View style={styles.arBadge}>
                    <Text style={styles.arBadgeText}>AR</Text>
                  </View>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={C.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Explore by Category ────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>{t('home.categories').toUpperCase()}</Text>
              <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>{t('home.seeAll')} →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.eraGrid}>
            {categoryCards.length === 0 ? (
              <Text style={styles.taxonomyEmpty}>{t('explore.empty')}</Text>
            ) : (
              categoryCards.map((item) => (
                <TouchableOpacity
                  key={`cat-${item.id}`}
                  style={styles.eraCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/explore',
                      params: { categoryId: String(item.id) },
                    })
                  }
                >
                  <LinearGradient
                    colors={[item.color + '18', item.color + '08']}
                    style={styles.eraGradient}
                  >
                    <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                    <Text style={[styles.eraName, { color: item.color }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* ── Explore by Theme ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>{t('home.topics')}</Text>
              <Text style={styles.sectionTitle}>{t('home.exploreByTheme')}</Text>
            </View>
          </View>

          <View style={styles.eraGrid}>
            {themeCards.length === 0 ? (
              <Text style={styles.taxonomyEmpty}>{t('home.noThemes')}</Text>
            ) : (
              themeCards.map((item) => (
                <TouchableOpacity
                  key={`theme-${item.id}`}
                  style={styles.eraCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/explore',
                      params: { themeId: String(item.id) },
                    })
                  }
                >
                  <LinearGradient
                    colors={[item.color + '18', item.color + '08']}
                    style={styles.eraGradient}
                  >
                    <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                    <Text style={[styles.eraName, { color: item.color }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('home.quickScan').toUpperCase()}</Text>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{t('home.heroCta')}</Text>

          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => router.push(action.route as any)}
              >
                <View style={styles.actionIconWrap}>
                  <MaterialCommunityIcons name={action.icon as any} size={22} color={C.accent} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: { fontSize: 13, color: C.textSecondary, letterSpacing: 0.5 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'baseline' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  headerTitleGold: { color: C.accent },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.accent + '60',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.accent },
  avatarBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.success,
    borderWidth: 1.5,
    borderColor: C.bgPrimary,
  },

  hero: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    height: 240,
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.accent + '25',
    marginBottom: 28,
  },
  heroBg: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBgEmoji: { fontSize: 120, opacity: 0.18 },
  heroGradient: { ...StyleSheet.absoluteFill },
  heroAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.accent,
    opacity: 0.8,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  heroCTA: { marginTop: 14, alignSelf: 'flex-start' },
  heroCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  heroCTAText: { fontSize: 13, fontWeight: '700', color: C.onAccent, letterSpacing: 0.3 },

  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 2,
    marginBottom: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, color: C.accent, fontWeight: '600' },

  museumCard: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  museumCardImage: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  museumEmoji: { fontSize: 56 },
  museumCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  museumCardInfo: { padding: 16 },
  museumBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  museumBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  museumName: { fontSize: 16, fontWeight: '800', color: C.textPrimary, lineHeight: 22, marginBottom: 6 },
  museumLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  museumCity: { fontSize: 12, color: C.textSecondary },
  museumMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  museumHours: { fontSize: 12, color: C.success, fontWeight: '600' },
  museumDot: { fontSize: 12, color: C.textMuted },
  museumTicket: { fontSize: 12, color: C.textSecondary },

  artifactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  artifactThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artifactThumbImage: { width: '100%', height: '100%' },
  artifactEmoji: { fontSize: 28 },
  artifactInfo: { flex: 1 },
  artifactCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  artifactTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  artifactEra: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  artifactRight: { alignItems: 'center', gap: 6 },
  arBadge: {
    backgroundColor: C.accentDark,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.accent + '50',
  },
  arBadgeText: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 1 },

  eraGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  eraCard: {
    width: '30%',
    flexGrow: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  eraGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  eraName: { fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  taxonomyEmpty: { fontSize: 13, color: C.textMuted, paddingVertical: 8 },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent + '40',
  },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, textAlign: 'center' },
});
