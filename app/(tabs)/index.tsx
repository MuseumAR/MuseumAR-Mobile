import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExhibits } from '../../src/hooks/useExhibits';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { C } from '../../src/theme/colors';

// ─── Era categories ───────────────────────────────────────────────────────────
const ERAS = [
  { id: '1', name: 'Văn Lang',   icon: 'lightning-bolt',     color: '#C89B3C' },
  { id: '2', name: 'Nhà Lý',     icon: 'home-city-outline',  color: '#A67C2D' },
  { id: '3', name: 'Nhà Trần',   icon: 'shield-outline',     color: '#C89B3C' },
  { id: '4', name: 'Nhà Lê',     icon: 'sword-cross',        color: '#A67C2D' },
  { id: '5', name: 'Nhà Nguyễn', icon: 'crown',              color: '#9A6F1F' },
];

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Scan AR',     icon: 'line-scan',        route: '/(tabs)/scan'    },
  { label: 'Audio Guide', icon: 'headphones',        route: '/(tabs)/explore' },
  { label: 'Saved',       icon: 'bookmark-outline',  route: '/(tabs)/profile' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { featured: featuredExhibits } = useExhibits();
  const { museum } = useMuseumProfile();

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
            <Text style={styles.greeting}>Welcome back</Text>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Museum</Text>
              <Text style={[styles.headerTitle, styles.headerTitleGold]}> AR</Text>
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
              <Text style={styles.heroTagText}>AR EXPERIENCE</Text>
            </View>
            <Text style={styles.heroTitle}>Discover History{'\n'}Through AR</Text>
            <Text style={styles.heroSubtitle}>
              Scan artifacts to see 3D models and listen to AI narration
            </Text>
            <View style={styles.heroCTA}>
              <LinearGradient
                colors={[C.accent, C.bronze]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroCTAGradient}
              >
                <MaterialCommunityIcons name="line-scan" size={16} color={C.onAccent} />
                <Text style={styles.heroCTAText}>Start AR Scan</Text>
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── About the Museum ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>YOUR MUSEUM</Text>
              <Text style={styles.sectionTitle}>About the Museum</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
              <Text style={styles.seeAll}>Details →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.museumCard}
          activeOpacity={0.88}
          onPress={() => router.push(`/museum/${museum.id}`)}
        >
          <View style={[styles.museumCardImage, { backgroundColor: museum.color + '18' }]}>
            <Text style={styles.museumEmoji}>🏛</Text>
            <LinearGradient
              colors={['transparent', 'rgba(247,242,233,0.95)']}
              style={styles.museumCardGradient}
            />
          </View>

          <View style={styles.museumCardInfo}>
            <View style={[styles.museumBadge, { borderColor: museum.color + '60' }]}>
              <Text style={[styles.museumBadgeText, { color: museum.color }]}>{museum.tag}</Text>
            </View>
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
              <Text style={styles.sectionLabel}>HIGHLIGHTS</Text>
              <Text style={styles.sectionTitle}>Notable Artifacts</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>View all →</Text>
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
                <Text style={styles.artifactEmoji}>{item.emoji}</Text>
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

        {/* ── Explore by Era ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>TIMELINE</Text>
              <Text style={styles.sectionTitle}>Explore by Era</Text>
            </View>
          </View>

          <View style={styles.eraGrid}>
            {ERAS.map((era) => (
              <TouchableOpacity key={era.id} style={styles.eraCard} activeOpacity={0.8}>
                <LinearGradient
                  colors={[era.color + '18', era.color + '08']}
                  style={styles.eraGradient}
                >
                  <MaterialCommunityIcons
                    name={era.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                    size={22}
                    color={era.color}
                  />
                  <Text style={[styles.eraName, { color: era.color }]}>{era.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>What's Next?</Text>

          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
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
  },
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
