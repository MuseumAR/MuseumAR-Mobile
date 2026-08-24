import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useVisitorLocation } from '../context/VisitorLocationContext';
import { useMaps } from '../hooks/useMaps';
import { useNavigationGraph } from '../hooks/useNavigationGraph';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import { useRooms } from '../hooks/useRooms';
import { useLanguage } from '../i18n/LanguageContext';
import type { MuseumMapDto, RoomDto } from '../services/apiService';
import { C } from '../theme/colors';
import { formatRoomRef, sortRoomsForLayout } from '../utils/routeNavigation';
import { FloorPathMap } from './FloorPathMap';
import { NavigationGuideCard } from './RouteNavigationOverlay';

function pickFloorMap(
  maps: MuseumMapDto[],
  room: RoomDto | null | undefined,
  floorNumber?: number | null,
): MuseumMapDto | null {
  const withImage = maps.filter((m) => Boolean(m.imageUrl));
  if (withImage.length === 0) return null;
  const mapId = room?.mapId != null ? Number(room.mapId) : 0;
  if (mapId > 0) {
    const byId = withImage.find((m) => m.id === mapId);
    if (byId) return byId;
  }
  const floor = room?.floorNumber ?? floorNumber;
  if (floor != null && floor > 0) {
    const byFloor = withImage.find((m) => m.floorNumber === floor);
    if (byFloor) return byFloor;
  }
  return withImage[0] ?? null;
}

/**
 * After a QR scan, current room is set. Buttons choose another room;
 * walking steps come from GET Navigation/route. Floor photo stays clean
 * until a destination is chosen, then only that path is drawn.
 */
export function ExhibitRoomNavigator({
  museumId,
  accentColor,
}: {
  museumId: number | null | undefined;
  accentColor: string;
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { location } = useVisitorLocation();
  const { rooms, loading } = useRooms(museumId);
  const { maps } = useMaps();
  const { graph } = useNavigationGraph(museumId);
  const [destRoomId, setDestRoomId] = useState<number | null>(null);

  const hereId = location?.roomId ?? null;
  const hereRoom = hereId != null ? rooms.find((r) => r.id === hereId) : null;
  const destRoom = destRoomId != null ? rooms.find((r) => r.id === destRoomId) : null;

  const { route, hasPath } = useNavigationRoute(hereId, destRoomId, {
    enabled: Boolean(hereId && destRoomId),
  });

  const floorMap = useMemo(
    () => pickFloorMap(maps, hereRoom, location?.floorNumber),
    [maps, hereRoom, location?.floorNumber],
  );

  const sorted = useMemo(() => sortRoomsForLayout(rooms), [rooms]);
  const otherRooms = useMemo(
    () => sorted.filter((r) => hereId == null || r.id !== hereId),
    [sorted, hereId],
  );

  const showPath = Boolean(hereId && destRoomId && hasPath);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('exhibit.goToRoom')}</Text>
      <Text style={styles.hint}>
        {hereId ? t('exhibit.goToRoomHint') : t('nav.scanToLocate')}
      </Text>

      {hereId ? (
        <View style={styles.hereRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={C.success} />
          <Text style={styles.hereText} numberOfLines={2}>
            {t('route.youAreHere')}: {formatRoomRef(location, lang)}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={16} color={C.onAccent} />
          <Text style={styles.scanBtnText}>{t('exhibit.scanToLocate')}</Text>
        </TouchableOpacity>
      )}

      {hereId && floorMap ? (
        <FloorPathMap
          map={floorMap}
          waypoints={graph?.waypoints ?? []}
          edges={graph?.edges ?? []}
          rooms={rooms}
          pathWaypoints={route?.pathWaypoints}
          instructions={route?.instructions}
          hereRoomId={hereId}
          destRoomId={destRoomId}
          showPath={showPath}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginVertical: 8 }} />
      ) : otherRooms.length === 0 ? (
        <Text style={styles.empty}>{t('exhibit.noOtherRooms')}</Text>
      ) : hereId ? (
        <View style={styles.chipWrap}>
          {otherRooms.map((room) => {
            const selected = destRoomId === room.id;
            return (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.chip,
                  selected && {
                    borderColor: accentColor,
                    backgroundColor: accentColor + '18',
                  },
                ]}
                onPress={() =>
                  setDestRoomId((prev) => (prev === room.id ? null : room.id))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && { color: accentColor, fontWeight: '800' },
                  ]}
                  numberOfLines={1}
                >
                  {formatRoomRef(room, lang)}
                </Text>
                {room.roomName && room.roomCode ? (
                  <Text style={styles.chipSub} numberOfLines={1}>
                    {room.roomName}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {hereId || destRoomId ? (
        <NavigationGuideCard
          from={
            location
              ? {
                  roomId: location.roomId,
                  roomName: location.roomName,
                  roomCode: location.roomCode,
                }
              : null
          }
          to={
            destRoomId
              ? {
                  roomId: destRoomId,
                  roomName: destRoom?.roomName,
                  roomCode: destRoom?.roomCode,
                }
              : null
          }
          rooms={rooms}
          accentColor={accentColor}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  hint: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  hereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  hereText: { flex: 1, fontSize: 13, fontWeight: '700', color: C.success },
  scanBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  scanBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 13 },
  empty: { fontSize: 13, color: C.textMuted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    maxWidth: '48%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgSurface,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  chipSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
});
