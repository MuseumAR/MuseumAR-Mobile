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
import { useRooms } from '../hooks/useRooms';
import { useLanguage } from '../i18n/LanguageContext';
import { C } from '../theme/colors';
import { formatRoomRef, sortRoomsForLayout } from '../utils/routeNavigation';
import { NavigationGuideCard } from './RouteNavigationOverlay';

/**
 * After a QR scan, current room is set. Buttons choose another room;
 * walking steps come from GET Navigation/route (existing BE).
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
  const [destRoomId, setDestRoomId] = useState<number | null>(null);

  const hereId = location?.roomId ?? null;
  const sorted = useMemo(() => sortRoomsForLayout(rooms), [rooms]);
  const otherRooms = useMemo(
    () => sorted.filter((r) => hereId == null || r.id !== hereId),
    [sorted, hereId],
  );
  const destRoom = destRoomId != null ? rooms.find((r) => r.id === destRoomId) : null;

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

      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginVertical: 8 }} />
      ) : otherRooms.length === 0 ? (
        <Text style={styles.empty}>{t('exhibit.noOtherRooms')}</Text>
      ) : (
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
      )}

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
