import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MUSEUMS, type MuseumRecord } from '../../src/data/museums';
import { C } from '../../src/theme/colors';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CITIES = ['All', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'];

const MUSEUM_EMOJI: Record<string, string> = {
  m1: '🏛', m2: '⚔️', m3: '🎭', m4: '🗿', m5: '🎨',
};

// ─── Museum card ──────────────────────────────────────────────────────────────

function MuseumCard({ museum }: { museum: MuseumRecord }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/museum/${museum.id}`)}
    >
      {/* Visual header */}
      <View style={[styles.cardHeader, { backgroundColor: museum.color + '18' }]}>
        <Text style={styles.cardEmoji}>{MUSEUM_EMOJI[museum.id] ?? '🏛'}</Text>

        <LinearGradient
          colors={['transparent', 'rgba(19,23,38,0.92)']}
          style={styles.cardHeaderGradient}
        />

        {/* Tag badge */}
        <View style={[styles.tagBadge, { borderColor: museum.color + '60' }]}>
          <Text style={[styles.tagText, { color: museum.color }]}>{museum.tag}</Text>
        </View>
      </View>

      {/* Info body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{museum.name}</Text>

        <View style={styles.cardLocation}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={C.textSecondary} />
          <Text style={styles.cardCity}>{museum.city}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cube-outline" size={12} color={C.accent} />
            <Text style={styles.statText}>{museum.exhibits.toLocaleString('vi-VN')}</Text>
          </View>
          <View style={styles.statDot} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="layers-outline" size={12} color={C.accent} />
            <Text style={styles.statText}>{museum.zones.length} zones</Text>
          </View>
          <View style={styles.statDot} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="augmented-reality" size={12} color={C.accent} />
            <Text style={styles.statText}>AR</Text>
          </View>
        </View>

        {/* Hours + CTA */}
        <View style={styles.cardFooter}>
          <View style={styles.hoursWrap}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={C.success} />
            <Text style={styles.hoursText}>{museum.openHours}</Text>
          </View>

          <LinearGradient
            colors={[C.accent, C.bronze]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.exploreBtn}
          >
            <Text style={styles.exploreBtnText}>Explore</Text>
            <MaterialCommunityIcons name="arrow-right" size={12} color={C.bgPrimary} />
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MuseumsScreen() {
  const [search, setSearch] = useState('');
  const [activeCity, setActiveCity] = useState('All');

  const filtered = MUSEUMS.filter((m) => {
    const matchCity = activeCity === 'All' || m.city === activeCity;
    const matchSearch =
      search.trim() === '' ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.city.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>EXPLORE</Text>
            <Text style={styles.title}>Museums</Text>
            <Text style={styles.subtitle}>{filtered.length} museums available</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: C.accentDark, borderColor: C.accent + '40' }]}>
            <MaterialCommunityIcons name="bank-outline" size={22} color={C.accent} />
          </View>
        </View>

        {/* ── Search bar ───────────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search museums..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
            selectionColor={C.accent}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── City filter ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {CITIES.map((city) => {
            const active = activeCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveCity(city)}
              >
                {active && (
                  <LinearGradient
                    colors={[C.accent + '30', C.accent + '10']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{city}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Museum list ──────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏛</Text>
            <Text style={styles.emptyText}>No museums found</Text>
          </View>
        ) : (
          <View style={styles.museumList}>
            {filtered.map((museum) => (
              <MuseumCard key={museum.id} museum={museum} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bgPrimary },
  scrollContent: { paddingBottom: 8 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
  },
  headerLabel: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 2, marginBottom: 3 },
  title:    { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  headerIcon: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 4,
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bgSurface, borderRadius: 14,
    marginHorizontal: 20, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: C.border, gap: 10,
  },
  searchIcon:  {},
  searchInput: { flex: 1, fontSize: 15, color: C.textPrimary, padding: 0 },

  filterList: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border,
  },
  filterChipActive: { borderColor: C.accent + '60' },
  filterText:       { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  filterTextActive: { color: C.accent, fontWeight: '700' },

  museumList: { paddingHorizontal: 20, gap: 16 },

  // Museum card
  card: {
    backgroundColor: C.bgSurface, borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
  },
  cardHeader: {
    height: 130, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: { fontSize: 56 },
  cardHeaderGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  tagBadge: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(19,23,38,0.75)',
  },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  cardBody: { padding: 16 },
  cardName: { fontSize: 16, fontWeight: '800', color: C.textPrimary, lineHeight: 22, marginBottom: 6 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  cardCity: { fontSize: 13, color: C.textSecondary },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:  { fontSize: 12, color: C.textSecondary },
  statDot:   { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border },

  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursWrap:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hoursText:    { fontSize: 12, color: C.success, fontWeight: '600' },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
  },
  exploreBtnText: { fontSize: 12, fontWeight: '700', color: C.bgPrimary },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText:  { fontSize: 16, color: C.textMuted, fontWeight: '600' },
});
