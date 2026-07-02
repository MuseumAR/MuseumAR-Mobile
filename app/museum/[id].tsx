import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ARPackCard } from '../../src/components/ARPackCard';
import { getPacksByMuseum } from '../../src/data/arPacks';
import { getMuseumById, MUSEUMS, type MuseumRecord, type MuseumZone } from '../../src/data/museums';
import { useARPacks } from '../../src/hooks/useARPacks';
import { useMuseumSyncCheck } from '../../src/hooks/useMuseumSyncCheck';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../src/theme/colors';
import { apiService } from '../../src/services/apiService';
import { parseNumericId } from '../../src/utils/parseId';

// ─── Pulsing dot (user location in floor plan) ────────────────────────────────

function PulsingDot() {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 2.6, duration: 950, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 950, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,    duration: 950, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.85, duration: 950, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  return (
    <View style={dotS.wrap}>
      <Animated.View style={[dotS.ring, { transform: [{ scale }], opacity }]} />
      <View style={dotS.core} />
    </View>
  );
}
const dotS = StyleSheet.create({
  wrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#22C55E' },
  core: { width: 9,  height: 9,  borderRadius: 5, backgroundColor: '#22C55E' },
});

// ─── Floor plan component (dynamic, driven by museum.zones) ───────────────────

type FloorPlanProps = {
  zones:          MuseumZone[];
  accentColor:    string;
  selectedZone:   string | null;
  onSelectZone:   (name: string) => void;
};

function FloorPlan({ zones, accentColor, selectedZone, onSelectZone }: FloorPlanProps) {
  // Unique indoor floors only (exclude outdoor)
  const floors = [
    ...new Set(
      zones
        .filter((z) => !z.floor.toLowerCase().includes('ngoài'))
        .map((z) => z.floor)
    ),
  ];

  const [activeFloor, setActiveFloor] = useState(floors[0] ?? '');
  const floorZones = zones.filter((z) => z.floor === activeFloor);

  // Pair zones into rows of 2 for layout
  const rows: MuseumZone[][] = [];
  for (let i = 0; i < floorZones.length; i += 2) {
    rows.push(floorZones.slice(i, i + 2));
  }

  return (
    <View>
      {/* Floor tabs */}
      {floors.length > 1 && (
        <View style={fpS.floorRow}>
          {floors.map((f) => {
            const active = f === activeFloor;
            return (
              <TouchableOpacity
                key={f}
                style={[fpS.floorTab, active && { borderColor: accentColor + '70' }]}
                onPress={() => setActiveFloor(f)}
              >
                {active && (
                  <LinearGradient
                    colors={[accentColor + '28', accentColor + '08']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <MaterialCommunityIcons name="layers-outline" size={12} color={active ? accentColor : C.textMuted} />
                <Text style={[fpS.floorTabText, active && { color: accentColor, fontWeight: '700' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Floor plan canvas */}
      <View style={fpS.canvas}>
        {/* Outer wall */}
        <View style={fpS.outerWall} />

        {/* Room rows */}
        <View style={fpS.roomsWrap}>
          {rows.map((row, ri) => (
            <View key={ri} style={fpS.roomRow}>
              {row.map((zone) => {
                const sel = selectedZone === zone.name;
                return (
                  <TouchableOpacity
                    key={zone.name}
                    style={[
                      fpS.room,
                      {
                        borderColor:     sel ? accentColor : accentColor + '45',
                        backgroundColor: sel ? accentColor + '18' : accentColor + '08',
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => onSelectZone(zone.name)}
                  >
                    {sel && (
                      <LinearGradient
                        colors={[accentColor + '20', 'transparent']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {/* Exhibit dot */}
                    <View style={[fpS.dot, { backgroundColor: accentColor, opacity: sel ? 1 : 0.55 }]} />
                    <Text
                      style={[fpS.roomLabel, { color: sel ? accentColor : accentColor + 'AA' }]}
                      numberOfLines={2}
                    >
                      {zone.name}
                    </Text>
                    <Text style={[fpS.roomCount, { color: sel ? accentColor : C.textMuted }]}>
                      {zone.items} artifacts
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Corridor */}
        <View style={fpS.corridor} />

        {/* Entrance + user location */}
        <View style={fpS.entranceRow}>
          <View style={fpS.entrance}>
            <View style={[fpS.entranceDoor, { backgroundColor: accentColor + '50' }]} />
            <Text style={fpS.entranceLabel}>ENTRANCE</Text>
          </View>
          <View style={fpS.userWrap}>
            <PulsingDot />
            <Text style={fpS.youLabel}>YOU</Text>
          </View>
        </View>
      </View>

      {/* Outdoor zones (if any) */}
      {zones.filter((z) => z.floor.toLowerCase().includes('ngoài')).map((z) => (
        <TouchableOpacity
          key={z.name}
          style={[fpS.outdoorZone, selectedZone === z.name && { borderColor: accentColor + '70' }]}
          onPress={() => onSelectZone(z.name)}
        >
          <MaterialCommunityIcons name="tree-outline" size={14} color={accentColor} />
          <Text style={fpS.outdoorLabel}>{z.name}</Text>
          <Text style={fpS.outdoorCount}>{z.items} artifacts · Outdoor</Text>
        </TouchableOpacity>
      ))}

      {/* Legend */}
      <View style={fpS.legend}>
        {[
          { color: '#22C55E', label: 'You are here' },
          { color: accentColor, label: 'Exhibit marker' },
          { color: accentColor + '45', label: 'Zone (tap to select)' },
        ].map((item) => (
          <View key={item.label} style={fpS.legendItem}>
            <View style={[fpS.legendDot, { backgroundColor: item.color }]} />
            <Text style={fpS.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const fpS = StyleSheet.create({
  floorRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  floorTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border,
  },
  floorTabText: { fontSize: 12, color: C.textMuted },

  canvas: {
    backgroundColor: '#0C0F1C', borderRadius: 14,
    overflow: 'hidden', paddingBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  outerWall: {
    position: 'absolute', inset: 0,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
  },
  roomsWrap: { padding: 10, gap: 8 },
  roomRow:   { flexDirection: 'row', gap: 8 },
  room: {
    flex: 1, minHeight: 80, borderRadius: 10,
    borderWidth: 1.5, padding: 10, overflow: 'hidden',
    justifyContent: 'flex-end', gap: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  roomLabel: { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  roomCount: { fontSize: 10 },

  corridor: {
    marginHorizontal: 10, height: 8,
    backgroundColor: '#1A1E2E', borderRadius: 2,
  },
  entranceRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 20, paddingTop: 10, paddingBottom: 2,
  },
  entrance:      { alignItems: 'center', gap: 3 },
  entranceDoor:  { width: 28, height: 7, borderRadius: 3 },
  entranceLabel: { fontSize: 8, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5 },
  userWrap:  { alignItems: 'center', gap: 2 },
  youLabel:  { fontSize: 7, fontWeight: '800', color: '#22C55E', letterSpacing: 1.5 },

  outdoorZone: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 8, padding: 12, borderRadius: 10,
    backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border,
  },
  outdoorLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: C.textPrimary },
  outdoorCount: { fontSize: 11, color: C.textMuted },

  legend: { flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.textMuted },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MuseumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [museum, setMuseum] = useState<MuseumRecord | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const { downloadPack, deletePack, getState } = useARPacks();
  const { checkSync } = useMuseumSyncCheck();
  const arPacks = getPacksByMuseum(id ?? '');

  useEffect(() => {
    // Hiển thị trước mock data nếu có để tránh giật lag màn hình
    const initial = getMuseumById(id ?? '');
    if (initial) {
      setMuseum(initial);
    }

    async function loadRealDetails() {
      try {
        const response = await apiService.getMuseums();
        if (response.data && response.data.length > 0) {
          const apiMuseum = response.data.find(
            (m) => m.id.toString() === id || `m${m.id}` === id || m.name.toLowerCase() === initial?.name.toLowerCase()
          );
          if (apiMuseum) {
            const local = MUSEUMS.find(
              (m) => m.name.toLowerCase() === apiMuseum.name.toLowerCase() || m.id === `m${apiMuseum.id}`
            );
            const merged: MuseumRecord = {
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
            };
            setMuseum(merged);
          }
        }
      } catch (error) {
        console.warn('Không thể tải chi tiết bảo tàng từ backend:', error);
      }
    }
    loadRealDetails();

    const museumId = parseNumericId(id);
    if (museumId != null) {
      checkSync(museumId);
    }
  }, [id, checkSync]);

  if (!museum) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Museum not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedZoneData = museum.zones.find((z) => z.name === selectedZone);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: museum.color + '20' }]}>
          {museum.thumbnailUrl && (
            <Image source={{ uri: museum.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <LinearGradient
            colors={['transparent', C.bgPrimary]}
            style={styles.heroGradient}
          />
          {!museum.thumbnailUrl && (
            <View style={[styles.heroEmojiBg, { backgroundColor: museum.color + '25' }]}>
              <Text style={styles.heroEmoji}>🏛</Text>
            </View>
          )}
          <View style={[styles.heroTag, { borderColor: museum.color + '60' }]}>
            <Text style={[styles.heroTagText, { color: museum.color }]}>{museum.tag}</Text>
          </View>
        </View>

        <View style={styles.content}>

          {/* ── Name & location ─────────────────────────────────────────── */}
          <Text style={styles.name}>{museum.name}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textSecondary} />
            <Text style={styles.city}>{museum.city} · Est. {museum.founded}</Text>
          </View>

          {/* ── Action buttons ──────────────────────────────────────────── */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/scan')}>
              <MaterialCommunityIcons name="line-scan" size={26} color={museum.color} />
              <Text style={styles.actionLabel}>AR Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/explore')}>
              <MaterialCommunityIcons name="headphones" size={26} color={museum.color} />
              <Text style={styles.actionLabel}>Audio Tour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => setFavorited((v) => !v)}>
              <MaterialCommunityIcons
                name={favorited ? 'heart' : 'heart-outline'}
                size={26}
                color={favorited ? '#EF4444' : museum.color}
              />
              <Text style={[styles.actionLabel, favorited && { color: '#EF4444' }]}>
                {favorited ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/ar-packs')}>
              <MaterialCommunityIcons name="package-variant-closed" size={26} color={museum.color} />
              <Text style={styles.actionLabel}>AR Packs</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stats bar ───────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: museum.color }]}>
                {museum.exhibits.toLocaleString('vi-VN')}
              </Text>
              <Text style={styles.statLabel}>Artifacts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: museum.color }]}>{museum.zones.length}</Text>
              <Text style={styles.statLabel}>Zones</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: museum.color }]}>AR</Text>
              <Text style={styles.statLabel}>Supported</Text>
            </View>
          </View>

          {/* ── Info grid ───────────────────────────────────────────────── */}
          <View style={styles.infoGrid}>
            {[
              { icon: '📍', label: 'Address',   value: museum.address },
              { icon: '⏰', label: 'Hours',     value: museum.openHours, note: `Closed: ${museum.closedDay}` },
              { icon: '🎫', label: 'Ticket',    value: museum.ticketPrice },
              { icon: '📞', label: 'Contact',   value: museum.phone },
            ].map((item) => (
              <View key={item.label} style={styles.infoCard}>
                <Text style={styles.infoIcon}>{item.icon}</Text>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
                {item.note && <Text style={styles.infoNote}>{item.note}</Text>}
              </View>
            ))}
          </View>

          {/* ── Description ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{museum.description}</Text>
          </View>

          {/* ── Highlights ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {museum.highlights.map((item, i) => (
              <View key={i} style={styles.highlightRow}>
                <View style={[styles.highlightDot, { backgroundColor: museum.color }]} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* ── Floor Plan ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Floor Plan</Text>
              <View style={[styles.livePill, { borderColor: '#22C55E40' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Interactive</Text>
              </View>
            </View>

            <FloorPlan
              zones={museum.zones}
              accentColor={museum.color}
              selectedZone={selectedZone}
              onSelectZone={(name) => setSelectedZone((prev) => (prev === name ? null : name))}
            />

            {/* Selected zone info card */}
            {selectedZoneData && (
              <View style={[styles.zoneInfoCard, { borderColor: museum.color + '50' }]}>
                <LinearGradient
                  colors={[museum.color + '10', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.zoneInfoLeft}>
                  <Text style={[styles.zoneInfoName, { color: museum.color }]}>
                    {selectedZoneData.name}
                  </Text>
                  <Text style={styles.zoneInfoMeta}>
                    {selectedZoneData.floor} · {selectedZoneData.items} artifacts
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.navigateBtn, { backgroundColor: museum.color + '20', borderColor: museum.color + '50' }]}
                  onPress={() => router.push('/(tabs)/scan')}
                >
                  <MaterialCommunityIcons name="navigation-variant-outline" size={16} color={museum.color} />
                  <Text style={[styles.navigateBtnText, { color: museum.color }]}>Go</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── AR Packs ────────────────────────────────────────────────── */}
          {arPacks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>AR Packs</Text>
                <TouchableOpacity onPress={() => router.push('/ar-packs')}>
                  <Text style={styles.seeAll}>View all</Text>
                </TouchableOpacity>
              </View>
              {arPacks.map((pack) => (
                <ARPackCard
                  key={pack.id}
                  pack={pack}
                  state={getState(pack.id)}
                  onDownload={() => downloadPack(pack.id)}
                  onDelete={() => deletePack(pack.id)}
                />
              ))}
            </View>
          )}

          {/* ── CTA: Start AR ───────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.arBtn}
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[museum.color, museum.color + 'AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.arBtnGradient}
            >
              <MaterialCommunityIcons name="line-scan" size={20} color="#fff" />
              <Text style={styles.arBtnText}>Start AR Experience</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bgPrimary },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: C.textMuted },

  hero: {
    height: 200, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  heroEmojiBg: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroEmoji: { fontSize: 38 },
  heroTag: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(19,23,38,0.6)',
  },
  heroTagText: { fontSize: 13, fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingTop: 4 },
  name:    { fontSize: 24, fontWeight: '800', color: C.textPrimary, lineHeight: 32 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  city:    { fontSize: 14, color: C.textSecondary },

  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 4 },
  actionCard: {
    flex: 1, backgroundColor: C.bgSurface, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border,
  },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary },

  statsRow: {
    flexDirection: 'row', backgroundColor: C.bgSurface,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14,
    marginTop: 18, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  statBox:    { flex: 1, alignItems: 'center' },
  statValue:  { fontSize: 18, fontWeight: '800' },
  statLabel:  { fontSize: 11, color: C.textMuted, marginTop: 3, textAlign: 'center' },
  statDivider:{ width: 1, height: 32, backgroundColor: C.divider },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  infoCard: {
    width: '48%', backgroundColor: C.bgSurface,
    borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: C.border,
  },
  infoIcon:  { fontSize: 18, marginBottom: 7 },
  infoLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginTop: 4, lineHeight: 18 },
  infoNote:  { fontSize: 11, color: C.danger, marginTop: 4 },

  section:      { marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  seeAll:       { fontSize: 14, color: C.accent, fontWeight: '600' },

  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: '#22C55E12',
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },

  description:  { fontSize: 15, color: C.textSecondary, lineHeight: 26 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  highlightDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7, marginRight: 12 },
  highlightText:{ flex: 1, fontSize: 15, color: C.textSecondary, lineHeight: 22 },

  // Selected zone info card
  zoneInfoCard: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, padding: 14, borderRadius: 14,
    backgroundColor: C.bgSurface, borderWidth: 1,
    overflow: 'hidden', gap: 12,
  },
  zoneInfoLeft: { flex: 1 },
  zoneInfoName: { fontSize: 14, fontWeight: '700' },
  zoneInfoMeta: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  navigateBtnText: { fontSize: 13, fontWeight: '700' },

  // AR button
  arBtn: { marginTop: 28, borderRadius: 16, overflow: 'hidden' },
  arBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  arBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});
