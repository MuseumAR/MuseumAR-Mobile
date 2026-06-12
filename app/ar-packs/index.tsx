import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ARPackCard } from '../../src/components/ARPackCard';
import { AR_PACKS } from '../../src/data/arPacks';
import { useARPacks } from '../../src/hooks/useARPacks';

const MUSEUMS = [
  { id: 'm1', name: 'Bảo tàng Lịch sử Quốc gia', color: '#1A6FA8' },
  { id: 'm2', name: 'Bảo tàng Chứng tích Chiến tranh', color: '#DC2626' },
  { id: 'm3', name: 'Bảo tàng Dân tộc học', color: '#059669' },
  { id: 'm4', name: 'Bảo tàng Điêu khắc Chăm', color: '#D97706' },
  { id: 'm5', name: 'Bảo tàng Mỹ thuật Việt Nam', color: '#7C3AED' },
];

export default function ARPacksScreen() {
  const router = useRouter();
  const { downloadPack, deletePack, getState } = useARPacks();

  const downloadedCount = AR_PACKS.filter(
    (p) => getState(p.id).status === 'downloaded',
  ).length;

  const totalSizeDownloaded = AR_PACKS.filter(
    (p) => getState(p.id).status === 'downloaded',
  ).reduce((sum, p) => sum + p.sizeMB, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Gói AR</Text>
          <Text style={styles.subtitle}>Tải về để xem hiện vật 3D khi offline</Text>
        </View>

        {/* Storage summary */}
        <View style={styles.storageCard}>
          <View style={styles.storageRow}>
            <View style={styles.storageItem}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#1A6FA8" />
              <Text style={styles.storageValue}>{downloadedCount}</Text>
              <Text style={styles.storageLabel}>Gói đã tải</Text>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageItem}>
              <MaterialCommunityIcons name="harddisk" size={24} color="#1A6FA8" />
              <Text style={styles.storageValue}>{totalSizeDownloaded} MB</Text>
              <Text style={styles.storageLabel}>Dung lượng dùng</Text>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageItem}>
              <MaterialCommunityIcons name="archive-outline" size={24} color="#1A6FA8" />
              <Text style={styles.storageValue}>{AR_PACKS.length}</Text>
              <Text style={styles.storageLabel}>Tổng gói</Text>
            </View>
          </View>
        </View>

        {/* Packs grouped by museum */}
        {MUSEUMS.map((museum) => {
          const packs = AR_PACKS.filter((p) => p.museumId === museum.id);
          return (
            <View key={museum.id} style={styles.museumSection}>
              <TouchableOpacity
                style={styles.museumHeader}
                onPress={() => router.push(`/museum/${museum.id}`)}
              >
                <View style={[styles.museumDot, { backgroundColor: museum.color }]} />
                <Text style={styles.museumName}>{museum.name}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {packs.map((pack) => (
                <ARPackCard
                  key={pack.id}
                  pack={pack}
                  state={getState(pack.id)}
                  onDownload={() => downloadPack(pack.id)}
                  onDelete={() => deletePack(pack.id)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  storageCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  storageRow: { flexDirection: 'row', alignItems: 'center' },
  storageItem: { flex: 1, alignItems: 'center', gap: 4 },
  storageValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  storageLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  storageDivider: { width: 1, height: 48, backgroundColor: '#F3F4F6' },
  museumSection: { paddingHorizontal: 20, marginBottom: 8 },
  museumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  museumDot: { width: 10, height: 10, borderRadius: 5 },
  museumName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
});
