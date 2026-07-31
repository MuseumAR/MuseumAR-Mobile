import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { ARPackCard } from '../../src/components/ARPackCard';
import {
  FloorPlanDirectionArrows,
  RouteNavigationOverlay,
} from '../../src/components/RouteNavigationOverlay';
import { type MuseumZone } from '../../src/data/museums';
import { useARPacks } from '../../src/hooks/useARPacks';
import { useMaps } from '../../src/hooks/useMaps';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useMuseumSyncCheck } from '../../src/hooks/useMuseumSyncCheck';
import { usePackages } from '../../src/hooks/usePackages';
import { useRooms } from '../../src/hooks/useRooms';
import { useRoutes } from '../../src/hooks/useRoutes';
import type {
  MuseumMapDto,
  RoomDto,
  TourRouteDto,
  TourRouteStopDto,
} from '../../src/services/apiService';
import {
  ActivityIndicator,
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
import {
  buildRouteStepGuide,
  sortRoomsForLayout,
  sortStops,
} from '../../src/utils/routeNavigation';

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
  ring: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.success },
  core: { width: 9,  height: 9,  borderRadius: 5, backgroundColor: C.success },
});

// ─── Floor plan (zones fallback OR BE rooms + route mode) ─────────────────────

type FloorPlanProps = {
  zones: MuseumZone[];
  rooms: RoomDto[];
  accentColor: string;
  selectedZone: string | null;
  onSelectZone: (name: string) => void;
  currentStop?: TourRouteStopDto | null;
  nextStop?: TourRouteStopDto | null;
  routeMode?: boolean;
};

function FloorPlan({
  zones,
  rooms,
  accentColor,
  selectedZone,
  onSelectZone,
  currentStop,
  nextStop,
  routeMode = false,
}: FloorPlanProps) {
  const useRoomsLayout = rooms.length > 0;
  const sortedRooms = useMemo(() => sortRoomsForLayout(rooms), [rooms]);

  const floors = useMemo(() => {
    if (useRoomsLayout) {
      return [...new Set(sortedRooms.map((r) => `Tầng ${r.floorNumber}`))];
    }
    return [
      ...new Set(
        zones
          .filter((z) => !z.floor.toLowerCase().includes('ngoài'))
          .map((z) => z.floor),
      ),
    ];
  }, [useRoomsLayout, sortedRooms, zones]);

  const [activeFloor, setActiveFloor] = useState(floors[0] ?? '');

  useEffect(() => {
    if (routeMode && currentStop?.floorNumber != null) {
      setActiveFloor(`Tầng ${currentStop.floorNumber}`);
      return;
    }
    if (floors.length > 0 && !floors.includes(activeFloor)) {
      setActiveFloor(floors[0]);
    }
  }, [floors, activeFloor, routeMode, currentStop?.floorNumber]);

  const floorNumMatch = activeFloor.match(/\d+/);
  const activeFloorNum = floorNumMatch ? Number(floorNumMatch[0]) : 1;

  const floorRooms = useRoomsLayout
    ? sortedRooms.filter((r) => r.floorNumber === activeFloorNum)
    : [];

  const floorZones = zones.filter((z) => z.floor === activeFloor);
  const zoneRows: MuseumZone[][] = [];
  for (let i = 0; i < floorZones.length; i += 2) {
    zoneRows.push(floorZones.slice(i, i + 2));
  }

  const roomRows: RoomDto[][] = [];
  for (let i = 0; i < floorRooms.length; i += 2) {
    roomRows.push(floorRooms.slice(i, i + 2));
  }

  const stepGuide =
    routeMode && currentStop && nextStop
      ? buildRouteStepGuide(currentStop, nextStop, rooms)
      : null;

  const matchStop = (room: RoomDto, stop?: TourRouteStopDto | null) => {
    if (!stop) return false;
    if (stop.roomId != null && stop.roomId === room.id) return true;
    if (
      stop.roomCode &&
      stop.roomCode.trim().toLowerCase() === room.roomCode.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  const showArrowOnFloor =
    Boolean(stepGuide) &&
    (currentStop?.floorNumber == null ||
      currentStop.floorNumber === activeFloorNum);

  return (
    <View>
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
                <MaterialCommunityIcons
                  name="layers-outline"
                  size={12}
                  color={active ? accentColor : C.textMuted}
                />
                <Text
                  style={[
                    fpS.floorTabText,
                    active && { color: accentColor, fontWeight: '700' },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={fpS.canvas}>
        <View style={fpS.outerWall} />

        {showArrowOnFloor && stepGuide ? (
          <FloorPlanDirectionArrows
            direction={stepGuide.direction}
            accentColor={accentColor}
          />
        ) : null}

        <View style={fpS.roomsWrap}>
          {useRoomsLayout
            ? roomRows.map((row, ri) => (
                <View key={`r-${ri}`} style={fpS.roomRow}>
                  {row.map((room) => {
                    const isHere = matchStop(room, currentStop);
                    const isNext = matchStop(room, nextStop);
                    const sel =
                      selectedZone === room.roomName || isHere || isNext;
                    const border = isHere
                      ? C.success
                      : isNext
                        ? accentColor
                        : sel
                          ? accentColor
                          : accentColor + '45';
                    const bg = isHere
                      ? C.success + '22'
                      : isNext
                        ? accentColor + '22'
                        : sel
                          ? accentColor + '18'
                          : accentColor + '08';
                    return (
                      <TouchableOpacity
                        key={room.id}
                        style={[
                          fpS.room,
                          { borderColor: border, backgroundColor: bg },
                          (isHere || isNext) && { borderWidth: 2 },
                        ]}
                        activeOpacity={0.75}
                        onPress={() => onSelectZone(room.roomName)}
                      >
                        {isHere && (
                          <View style={fpS.badgeHere}>
                            <PulsingDot />
                            <Text style={fpS.badgeHereText}>Bạn đang ở đây</Text>
                          </View>
                        )}
                        {isNext && !isHere && (
                          <Text style={[fpS.badgeNext, { color: accentColor }]}>
                            Hiện vật tiếp theo 🎯
                          </Text>
                        )}
                        <View
                          style={[
                            fpS.dot,
                            {
                              backgroundColor: isHere ? C.success : accentColor,
                              opacity: sel ? 1 : 0.55,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            fpS.roomLabel,
                            {
                              color: isHere
                                ? C.success
                                : sel
                                  ? accentColor
                                  : accentColor + 'AA',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {room.roomCode
                            ? `Phòng ${room.roomCode}`
                            : room.roomName}
                        </Text>
                        <Text
                          style={[
                            fpS.roomCount,
                            { color: sel ? accentColor : C.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {room.roomName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))
            : zoneRows.map((row, ri) => (
                <View key={ri} style={fpS.roomRow}>
                  {row.map((zone) => {
                    const sel = selectedZone === zone.name;
                    return (
                      <TouchableOpacity
                        key={zone.name}
                        style={[
                          fpS.room,
                          {
                            borderColor: sel ? accentColor : accentColor + '45',
                            backgroundColor: sel
                              ? accentColor + '18'
                              : accentColor + '08',
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
                        <View
                          style={[
                            fpS.dot,
                            {
                              backgroundColor: accentColor,
                              opacity: sel ? 1 : 0.55,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            fpS.roomLabel,
                            { color: sel ? accentColor : accentColor + 'AA' },
                          ]}
                          numberOfLines={2}
                        >
                          {zone.name}
                        </Text>
                        <Text
                          style={[
                            fpS.roomCount,
                            { color: sel ? accentColor : C.textMuted },
                          ]}
                        >
                          {zone.items} artifacts
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
        </View>

        {!useRoomsLayout && floorZones.length === 0 ? (
          <Text style={fpS.emptyHint}>
            Chưa có phòng / zone để hiển thị sơ đồ.
          </Text>
        ) : null}
        {useRoomsLayout && floorRooms.length === 0 ? (
          <Text style={fpS.emptyHint}>Tầng này chưa có phòng.</Text>
        ) : null}

        <View style={fpS.corridor} />

        <View style={fpS.entranceRow}>
          <View style={fpS.entrance}>
            <View
              style={[fpS.entranceDoor, { backgroundColor: accentColor + '50' }]}
            />
            <Text style={fpS.entranceLabel}>ENTRANCE</Text>
          </View>
          {!routeMode && (
            <View style={fpS.userWrap}>
              <PulsingDot />
              <Text style={fpS.youLabel}>YOU</Text>
            </View>
          )}
        </View>
      </View>

      {!useRoomsLayout &&
        zones
          .filter((z) => z.floor.toLowerCase().includes('ngoài'))
          .map((z) => (
            <TouchableOpacity
              key={z.name}
              style={[
                fpS.outdoorZone,
                selectedZone === z.name && { borderColor: accentColor + '70' },
              ]}
              onPress={() => onSelectZone(z.name)}
            >
              <MaterialCommunityIcons
                name="tree-outline"
                size={14}
                color={accentColor}
              />
              <Text style={fpS.outdoorLabel}>{z.name}</Text>
              <Text style={fpS.outdoorCount}>
                {z.items} artifacts · Outdoor
              </Text>
            </TouchableOpacity>
          ))}

      <View style={fpS.legend}>
        {(routeMode
          ? [
              { color: C.success, label: 'Bạn đang ở đây' },
              { color: accentColor, label: 'Điểm đến kế tiếp' },
              { color: accentColor + '45', label: 'Phòng khác' },
            ]
          : [
              { color: C.success, label: 'You are here' },
              { color: accentColor, label: 'Exhibit marker' },
              { color: accentColor + '45', label: 'Zone (tap to select)' },
            ]
        ).map((item) => (
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
  badgeHere: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  badgeHereText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.success,
    letterSpacing: 0.2,
  },
  badgeNext: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyHint: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

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
  youLabel:  { fontSize: 7, fontWeight: '800', color: C.success, letterSpacing: 1.5 },

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

// ─── API map image viewer (when MuseumMaps have MapImageUrl) ─────────────────

type MuseumMapImagesProps = {
  maps: MuseumMapDto[];
  accentColor: string;
};

/** Horizontal padding of the screen content — page width must exclude it. */
const CONTENT_PADDING = 20;

function MuseumMapImages({ maps, accentColor }: MuseumMapImagesProps) {
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(1, windowWidth - CONTENT_PADDING * 2);
  const pagerRef = useRef<ScrollView | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = Math.min(activeIndex, maps.length - 1);
  const active = maps[safeIndex];

  useEffect(() => {
    if (activeIndex > maps.length - 1) setActiveIndex(0);
  }, [maps.length, activeIndex]);

  const goToIndex = (index: number) => {
    setActiveIndex(index);
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  };

  if (!active?.imageUrl) return null;

  return (
    <View>
      {maps.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={fpS.floorRow}
        >
          {maps.map((m, index) => {
            const activeTab = index === safeIndex;
            return (
              <TouchableOpacity
                key={m.id}
                style={[fpS.floorTab, activeTab && { borderColor: accentColor + '70' }]}
                onPress={() => goToIndex(index)}
              >
                {activeTab && (
                  <LinearGradient
                    colors={[accentColor + '28', accentColor + '08']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <MaterialCommunityIcons
                  name="map-outline"
                  size={12}
                  color={activeTab ? accentColor : C.textMuted}
                />
                <Text
                  style={[fpS.floorTabText, activeTab && { color: accentColor, fontWeight: '700' }]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
          setActiveIndex(Math.max(0, Math.min(index, maps.length - 1)));
        }}
      >
        {maps.map((m) => (
          <View key={m.id} style={[mapImgS.frame, { width: pageWidth }]}>
            <Image
              source={{ uri: m.imageUrl }}
              style={mapImgS.image}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>

      <View style={mapImgS.footer}>
        {active.label ? <Text style={mapImgS.caption}>{active.label}</Text> : null}
        {maps.length > 1 && (
          <View style={mapImgS.dots}>
            {maps.map((m, index) => (
              <View
                key={m.id}
                style={[
                  mapImgS.dot,
                  {
                    backgroundColor:
                      index === safeIndex ? accentColor : C.border,
                    width: index === safeIndex ? 18 : 6,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const mapImgS = StyleSheet.create({
  frame: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 220,
  },
  image: {
    width: '100%',
    height: 280,
  },
  footer: { marginTop: 8, alignItems: 'center', gap: 8 },
  caption: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MuseumDetailScreen() {
  const router = useRouter();
  const { museum } = useMuseumProfile();
  const museumId = Number(museum.id) || 0;
  const [favorited, setFavorited] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const { downloadPack, deletePack, getState } = useARPacks();
  const { checkSync } = useMuseumSyncCheck();
  const { packs: arPacks } = usePackages();
  const { routes, loading: routesLoading, error: routesError, loadRouteDetail } =
    useRoutes();
  const { maps, loading: mapsLoading } = useMaps();
  const { rooms } = useRooms(museumId > 0 ? museumId : null);

  const [activeRoute, setActiveRoute] = useState<TourRouteDto | null>(null);
  const [stopIndex, setStopIndex] = useState(0);
  const [startingRouteId, setStartingRouteId] = useState<number | null>(null);

  const routeStops = useMemo(
    () => sortStops(activeRoute?.stops ?? []),
    [activeRoute],
  );
  const routeMode = routeStops.length > 0;
  const currentStop = routeMode ? routeStops[stopIndex] ?? null : null;
  const nextStop =
    routeMode && stopIndex < routeStops.length - 1
      ? routeStops[stopIndex + 1]
      : null;

  const mapsWithImage = useMemo(
    () =>
      maps
        .filter((m) => Boolean(m.imageUrl))
        .sort((a, b) => {
          const fa = a.floorNumber;
          const fb = b.floorNumber;
          if (fa != null && fb != null && fa !== fb) return fa - fb;
          if (fa != null && fb == null) return -1;
          if (fa == null && fb != null) return 1;
          return a.id - b.id;
        }),
    [maps],
  );
  const hasMapImage = mapsWithImage.length > 0;
  // Map images when available; switch to interactive room plan in route mode (or no images).
  const showInteractivePlan = routeMode || !hasMapImage;

  /** Rooms for layout — fall back to unique rooms inferred from active route stops. */
  const layoutRooms = useMemo(() => {
    if (rooms.length > 0) return rooms;
    if (!routeMode) return [];
    const byKey = new Map<string, RoomDto>();
    for (const s of routeStops) {
      const code = (s.roomCode || `E${s.exhibitId}`).trim();
      const key = `${s.floorNumber ?? 1}:${code}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: s.roomId ?? s.exhibitId,
        museumId,
        mapId: s.mapId ?? null,
        roomCode: code,
        roomName: s.roomName || s.exhibitName || code,
        floorNumber: s.floorNumber ?? 1,
      });
    }
    return [...byKey.values()];
  }, [rooms, routeMode, routeStops, museumId]);

  useEffect(() => {
    checkSync();
  }, [checkSync]);

  const selectedZoneData = museum.zones.find((z) => z.name === selectedZone);

  const startRoute = async (route: TourRouteDto) => {
    setStartingRouteId(route.id);
    try {
      const loaded = await loadRouteDetail(route.id);
      const detail = loaded ?? route;
      const stops = sortStops(detail.stops ?? []);
      if (stops.length === 0) {
        setActiveRoute(null);
        setStopIndex(0);
        return;
      }
      setActiveRoute({ ...detail, stops });
      setStopIndex(0);
    } finally {
      setStartingRouteId(null);
    }
  };

  const exitRoute = () => {
    setActiveRoute(null);
    setStopIndex(0);
  };

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
        </View>

        <View style={styles.content}>

          {/* ── Name & location ─────────────────────────────────────────── */}
          <Text style={styles.name}>{museum.name}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textSecondary} />
            <Text style={styles.city}>
              {museum.city}
              {museum.founded ? ` · Est. ${museum.founded}` : ''}
            </Text>
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
              <Text style={[styles.statValue, { color: museum.color }]}>
                {museum.zones.length > 0 ? museum.zones.length : '—'}
              </Text>
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
              {
                icon: '⏰',
                label: 'Hours',
                value: museum.openHours,
                note: museum.closedDay ? `Closed: ${museum.closedDay}` : undefined,
              },
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
          {museum.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{museum.description}</Text>
            </View>
          ) : null}

          {/* ── Highlights ──────────────────────────────────────────────── */}
          {museum.highlights.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Highlights</Text>
              {museum.highlights.map((item, i) => (
                <View key={i} style={styles.highlightRow}>
                  <View style={[styles.highlightDot, { backgroundColor: museum.color }]} />
                  <Text style={styles.highlightText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Floor Plan / Map image ──────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Floor Plan</Text>
              <View style={[styles.livePill, { borderColor: C.success + '40' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {routeMode
                    ? 'Route mode'
                    : hasMapImage
                      ? 'Map image'
                      : rooms.length > 0
                        ? 'Rooms'
                        : 'Interactive'}
                </Text>
              </View>
            </View>

            {mapsLoading ? (
              <ActivityIndicator color={museum.color} style={{ marginVertical: 16 }} />
            ) : showInteractivePlan ? (
              <FloorPlan
                zones={museum.zones}
                rooms={layoutRooms}
                accentColor={museum.color}
                selectedZone={selectedZone}
                onSelectZone={(name) =>
                  setSelectedZone((prev) => (prev === name ? null : name))
                }
                routeMode={routeMode}
                currentStop={currentStop}
                nextStop={nextStop}
              />
            ) : (
              <MuseumMapImages maps={mapsWithImage} accentColor={museum.color} />
            )}

            {routeMode && activeRoute ? (
              <RouteNavigationOverlay
                stops={routeStops}
                stopIndex={stopIndex}
                rooms={layoutRooms}
                accentColor={museum.color}
                routeName={activeRoute.name}
                onPrev={() => setStopIndex((i) => Math.max(0, i - 1))}
                onNext={() =>
                  setStopIndex((i) => Math.min(routeStops.length - 1, i + 1))
                }
                onExit={exitRoute}
              />
            ) : null}

            {/* Selected zone info card — only when not in route mode */}
            {!routeMode && selectedZoneData && !hasMapImage ? (
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
                  style={[
                    styles.navigateBtn,
                    {
                      backgroundColor: museum.color + '20',
                      borderColor: museum.color + '50',
                    },
                  ]}
                  onPress={() => router.push('/(tabs)/scan')}
                >
                  <MaterialCommunityIcons
                    name="navigation-variant-outline"
                    size={16}
                    color={museum.color}
                  />
                  <Text style={[styles.navigateBtnText, { color: museum.color }]}>
                    Go
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!routeMode && hasMapImage ? (
              <Text style={[styles.routeMeta, { marginTop: 8 }]}>
                Chọn một lộ trình bên dưới để mở chỉ đường phòng (mũi tên lên/xuống/trái/phải).
              </Text>
            ) : null}
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

          {/* ── Tour routes ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tour tham quan</Text>
            {routesLoading ? (
              <Text style={styles.routeMeta}>Đang tải lộ trình…</Text>
            ) : routes.length === 0 ? (
              <Text style={styles.routeMeta}>
                {routesError ?? 'Chưa có lộ trình tham quan.'}
              </Text>
            ) : (
              routes.map((r) => {
                const active = activeRoute?.id === r.id;
                const loadingThis = startingRouteId === r.id;
                const stopLabel =
                  r.stopCount ??
                  (Array.isArray(r.stops) && r.stops.length > 0
                    ? r.stops.length
                    : null);
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.routeRow,
                      active && {
                        borderColor: museum.color,
                        backgroundColor: museum.color + '12',
                      },
                    ]}
                    activeOpacity={0.85}
                    disabled={loadingThis}
                    onPress={() => {
                      if (active) exitRoute();
                      else void startRoute(r);
                    }}
                  >
                    <View
                      style={[
                        styles.routeIcon,
                        {
                          backgroundColor: museum.color + '18',
                          borderColor: museum.color + '40',
                        },
                      ]}
                    >
                      {loadingThis ? (
                        <ActivityIndicator size="small" color={museum.color} />
                      ) : (
                        <MaterialCommunityIcons
                          name={active ? 'navigation-variant' : 'map-marker-path'}
                          size={18}
                          color={museum.color}
                        />
                      )}
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeName} numberOfLines={1}>
                        {r.name || `Tour #${r.id}`}
                      </Text>
                      <Text style={styles.routeMeta}>
                        {[
                          r.durationMinutes != null
                            ? `${r.durationMinutes} phút`
                            : null,
                          stopLabel != null ? `${stopLabel} điểm` : null,
                          active ? 'Đang chỉ đường · chạm để tắt' : 'Chạm để chỉ đường',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? 'close-circle-outline' : 'chevron-right'}
                      size={20}
                      color={active ? museum.color : C.textMuted}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

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
              <MaterialCommunityIcons name="line-scan" size={20} color={C.onAccent} />
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
    backgroundColor: C.success + '12',
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  liveText: { fontSize: 11, fontWeight: '700', color: C.success },

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

  // Tour routes
  routeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bgSurface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  routeIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  routeMeta: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  // AR button
  arBtn: { marginTop: 28, borderRadius: 16, overflow: 'hidden' },
  arBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  arBtnText: { fontSize: 16, fontWeight: '800', color: C.onAccent },
});
