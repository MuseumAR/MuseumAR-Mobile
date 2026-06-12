import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ZONES = [
  { id: '1', name: 'Khu Tiền sử', floor: 'Tầng 1', color: '#F59E0B', items: 24 },
  { id: '2', name: 'Khu Đông Sơn', floor: 'Tầng 1', color: '#10B981', items: 36 },
  { id: '3', name: 'Khu Champa', floor: 'Tầng 2', color: '#8B5CF6', items: 18 },
  { id: '4', name: 'Khu Óc Eo', floor: 'Tầng 2', color: '#EF4444', items: 21 },
  { id: '5', name: 'Khu Phong kiến', floor: 'Tầng 3', color: '#1A6FA8', items: 45 },
];

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bản đồ bảo tàng</Text>
        <Text style={styles.subtitle}>Chọn khu vực để xem danh sách hiện vật</Text>
      </View>

      {/* Map placeholder - sẽ tích hợp expo-location / bản đồ SVG sau */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapGrid}>
          {ZONES.slice(0, 2).map((zone) => (
            <View key={zone.id} style={[styles.mapZone, { backgroundColor: zone.color + '33' }]}>
              <View style={[styles.mapZoneDot, { backgroundColor: zone.color }]} />
              <Text style={[styles.mapZoneLabel, { color: zone.color }]}>{zone.name}</Text>
            </View>
          ))}
        </View>
        <View style={styles.mapGrid}>
          {ZONES.slice(2, 4).map((zone) => (
            <View key={zone.id} style={[styles.mapZone, { backgroundColor: zone.color + '33' }]}>
              <View style={[styles.mapZoneDot, { backgroundColor: zone.color }]} />
              <Text style={[styles.mapZoneLabel, { color: zone.color }]}>{zone.name}</Text>
            </View>
          ))}
        </View>
        <View style={styles.mapGrid}>
          {ZONES.slice(4).map((zone) => (
            <View
              key={zone.id}
              style={[styles.mapZone, styles.mapZoneFull, { backgroundColor: zone.color + '33' }]}
            >
              <View style={[styles.mapZoneDot, { backgroundColor: zone.color }]} />
              <Text style={[styles.mapZoneLabel, { color: zone.color }]}>{zone.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Zone list */}
      <View style={styles.zoneList}>
        <Text style={styles.zoneListTitle}>Các khu trưng bày</Text>
        {ZONES.map((zone) => (
          <TouchableOpacity key={zone.id} style={styles.zoneCard}>
            <View style={[styles.zoneColorBar, { backgroundColor: zone.color }]} />
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneMeta}>
                {zone.floor} · {zone.items} hiện vật
              </Text>
            </View>
            <Text style={styles.zoneArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  mapPlaceholder: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  mapGrid: { flexDirection: 'row', gap: 10 },
  mapZone: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    height: 70,
    justifyContent: 'flex-end',
  },
  mapZoneFull: { flex: 1 },
  mapZoneDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  mapZoneLabel: { fontSize: 11, fontWeight: '700' },
  zoneList: { paddingHorizontal: 20, paddingTop: 16 },
  zoneListTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  zoneColorBar: { width: 4, height: '100%', minHeight: 56 },
  zoneInfo: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  zoneName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  zoneMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  zoneArrow: { fontSize: 22, color: '#9CA3AF', paddingRight: 16 },
});
