import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MUSEUMS, type MuseumRecord } from '../../src/data/museums';
import { getFeaturedExhibits } from '../../src/data/exhibits';
import { C } from '../../src/theme/colors';
import { useEffect, useState } from 'react';
import { apiService, MuseumDto } from '../../src/services/apiService';

// ─── Era categories ───────────────────────────────────────────────────────────
const ERAS = [
  { id: '1', name: 'Văn Lang',   icon: 'lightning-bolt',     color: '#D4A94D' },
  { id: '2', name: 'Nhà Lý',     icon: 'home-city-outline',  color: '#A97142' },
  { id: '3', name: 'Nhà Trần',   icon: 'shield-outline',     color: '#D4A94D' },
  { id: '4', name: 'Nhà Lê',     icon: 'sword-cross',        color: '#A97142' },
  { id: '5', name: 'Nhà Nguyễn', icon: 'crown',              color: '#D4A94D' },
];

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Scan AR',     icon: 'line-scan',        route: '/(tabs)/scan'    },
  { label: 'Audio Guide', icon: 'headphones',        route: '/(tabs)/explore' },
  { label: 'Saved',       icon: 'bookmark-outline',  route: '/(tabs)/profile' },
] as const;

// ─── Museum emoji map (visual placeholder before real images) ─────────────────
const MUSEUM_EMOJI: Record<string, string> = {
  m1: '🏛', m2: '⚔️', m3: '🎭', m4: '🗿', m5: '🎨',
};

// Hàm gộp dữ liệu từ Backend API và dữ liệu giả lập Local
function mergeMuseumData(apiMuseums: MuseumDto[]): MuseumRecord[] {
  return apiMuseums.map((apiMuseum) => {
    const local = MUSEUMS.find(
      (m) => m.name.toLowerCase() === apiMuseum.name.toLowerCase() || m.id === `m${apiMuseum.id}`
    );
    return {
      id: apiMuseum.id.toString(),
      name: apiMuseum.name,
      city: apiMuseum.city || local?.city || 'Việt Nam',
      tag: local?.tag || 'Lịch sử',
      color: local?.color || '#1A6FA8',
      address: apiMuseum.address || local?.address || '',
      phone: local?.phone || '',
      openHours: local?.openHours || '8:00 – 17:00',
      closedDay: local?.closedDay || 'Thứ Hai',
      ticketPrice: local?.ticketPrice || 'Miễn phí',
      exhibits: local?.exhibits || 0,
      founded: local?.founded || 'Chưa rõ',
      description: apiMuseum.description || local?.description || '',
      highlights: local?.highlights || [],
      zones: local?.zones || [],
      thumbnailUrl: apiMuseum.thumbnailUrl,
    } as MuseumRecord;
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const featuredExhibits = getFeaturedExhibits();
  const [museumList, setMuseumList] = useState<MuseumRecord[]>(MUSEUMS);

  useEffect(() => {
    async function loadRealMuseums() {
      try {
        const response = await apiService.getMuseums();
        if (response.data && response.data.length > 0) {
          const merged = mergeMuseumData(response.data);
          setMuseumList(merged);
        }
      } catch (error) {
        console.warn('Không thể tải dữ liệu bảo tàng từ backend, sử dụng mock data:', error);
      }
    }
    loadRealMuseums();
  }, []);

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
          {/* Simulated artifact background */}
          <View style={styles.heroBg}>
            <Text style={styles.heroBgEmoji}>🥁</Text>
          </View>

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(8,10,20,0.6)', 'rgba(8,10,20,0.97)']}
            locations={[0, 0.45, 1]}
            style={styles.heroGradient}
          />

          {/* Gold top accent line */}
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
                <MaterialCommunityIcons name="line-scan" size={16} color="#080A14" />
                <Text style={styles.heroCTAText}>Start AR Scan</Text>
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Featured Museums ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>COLLECTIONS</Text>
              <Text style={styles.sectionTitle}>Featured Museums</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
              <Text style={styles.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.museumList}
        >
          {museumList.map((museum) => (
            <TouchableOpacity
              key={museum.id}
              style={styles.museumCard}
              activeOpacity={0.88}
              onPress={() => router.push(`/museum/${museum.id}`)}
            >
              {/* Card visual */}
              <View style={[styles.museumCardImage, { backgroundColor: museum.color + '18' }]}>
                {museum.thumbnailUrl ? (
                  <Image source={{ uri: museum.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Text style={styles.museumEmoji}>{MUSEUM_EMOJI[museum.id] ?? '🏛'}</Text>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(19,23,38,0.9)']}
                  style={styles.museumCardGradient}
                />
              </View>

              {/* Glass info panel */}
              <View style={styles.museumCardInfo}>
                <View style={[styles.museumBadge, { borderColor: museum.color + '60' }]}>
                  <Text style={[styles.museumBadgeText, { color: museum.color }]}>{museum.tag}</Text>
                </View>
                <Text style={styles.museumName} numberOfLines={2}>{museum.name}</Text>
                <View style={styles.museumLocation}>
                  <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.textSecondary} />
                  <Text style={styles.museumCity}>{museum.city}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

          {featuredExhibits.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.artifactRow}
              activeOpacity={0.85}
              onPress={() => router.push(`/exhibit/${item.id}`)}
            >
              {/* Thumbnail */}
              <View style={[styles.artifactThumb, { backgroundColor: item.color + '18' }]}>
                <Text style={styles.artifactEmoji}>{item.emoji}</Text>
              </View>

              {/* Info */}
              <View style={styles.artifactInfo}>
                <Text style={styles.artifactCategory}>{item.category}</Text>
                <Text style={styles.artifactTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.artifactEra}>{item.era}</Text>
              </View>

              {/* AR badge + arrow */}
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

        {/* bottom padding */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // ── Header ──────────────────────────────────────
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
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: C.bgPrimary,
  },

  // ── Hero ─────────────────────────────────────────
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
    color: '#FFFFFF',
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
  heroCTAText: { fontSize: 13, fontWeight: '700', color: '#080A14', letterSpacing: 0.3 },

  // ── Sections ──────────────────────────────────────
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

  // ── Museum cards ──────────────────────────────────
  museumList: { paddingHorizontal: 20, gap: 14, paddingBottom: 4, marginBottom: 28 },
  museumCard: {
    width: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  museumCardImage: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  museumEmoji: { fontSize: 48 },
  museumCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  museumCardInfo: { padding: 14 },
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
  museumName: { fontSize: 13, fontWeight: '700', color: C.textPrimary, lineHeight: 18, marginBottom: 6 },
  museumLocation: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  museumCity: { fontSize: 11, color: C.textSecondary },

  // ── Artifact rows ─────────────────────────────────
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

  // ── Era grid ──────────────────────────────────────
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

  // ── Quick actions ─────────────────────────────────
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
