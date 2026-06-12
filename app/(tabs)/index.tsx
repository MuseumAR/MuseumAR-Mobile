import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MUSEUMS = [
  { id: 'm1', name: 'Bảo tàng Lịch sử Quốc gia', city: 'Hà Nội', exhibits: 200000, tag: 'Lịch sử', color: '#1A6FA8' },
  { id: 'm2', name: 'Bảo tàng Chứng tích Chiến tranh', city: 'TP. Hồ Chí Minh', exhibits: 20000, tag: 'Chiến tranh', color: '#DC2626' },
  { id: 'm3', name: 'Bảo tàng Dân tộc học Việt Nam', city: 'Hà Nội', exhibits: 15000, tag: 'Văn hóa', color: '#059669' },
  { id: 'm4', name: 'Bảo tàng Điêu khắc Chăm', city: 'Đà Nẵng', exhibits: 2000, tag: 'Điêu khắc', color: '#D97706' },
  { id: 'm5', name: 'Bảo tàng Mỹ thuật Việt Nam', city: 'Hà Nội', exhibits: 17000, tag: 'Nghệ thuật', color: '#7C3AED' },
];

const FEATURED_EXHIBITS = [
  { id: '1', title: 'Trống đồng Đông Sơn', era: 'Thế kỷ VII-I TCN', category: 'Đồ đồng' },
  { id: '2', title: 'Tượng Phật Đồng Dương', era: 'Thế kỷ IX', category: 'Điêu khắc' },
  { id: '3', title: 'Gốm Chu Đậu', era: 'Thế kỷ XIV-XV', category: 'Gốm sứ' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào 👋</Text>
          <Text style={styles.title}>Bảo tàng AR</Text>
          <Text style={styles.subtitle}>Khám phá lịch sử qua thực tế tăng cường</Text>
        </View>

        {/* AR Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Trải nghiệm AR mới!</Text>
          <Text style={styles.bannerDesc}>
            Quét QR hoặc hướng camera vào hiện vật để xem mô hình 3D
          </Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.bannerBtnText}>Bắt đầu quét</Text>
          </TouchableOpacity>
        </View>

        {/* Museum List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách bảo tàng</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.museumList}
        >
          {MUSEUMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.museumCard}
              onPress={() => router.push(`/museum/${item.id}`)}
            >
              <View style={[styles.museumCardTop, { backgroundColor: item.color + '20' }]}>
                <View style={[styles.museumDot, { backgroundColor: item.color }]} />
                <View style={[styles.museumTag, { backgroundColor: item.color + '30' }]}>
                  <Text style={[styles.museumTagText, { color: item.color }]}>{item.tag}</Text>
                </View>
              </View>
              <View style={styles.museumCardBody}>
                <Text style={styles.museumName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.museumCity}>{item.city}</Text>
                <Text style={styles.museumExhibits}>
                  {item.exhibits.toLocaleString('vi-VN')} hiện vật
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Exhibits */}
        <View style={styles.sectionHeaderSpaced}>
          <Text style={styles.sectionTitle}>Hiện vật nổi bật</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exhibitSection}>
          {FEATURED_EXHIBITS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/exhibit/${item.id}`)}
            >
              <View style={styles.cardThumb} />
              <View style={styles.cardContent}>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardEra}>{item.era}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 14, color: '#6B7280' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginTop: 2 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  banner: { margin: 20, backgroundColor: '#1A6FA8', borderRadius: 16, padding: 20 },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  bannerDesc: { fontSize: 13, color: '#BAD9F0', marginTop: 6, lineHeight: 20 },
  bannerBtn: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  bannerBtnText: { color: '#1A6FA8', fontWeight: '700', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 14, color: '#1A6FA8', fontWeight: '600' },
  museumList: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  museumCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  museumCardTop: {
    height: 80,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  museumDot: { width: 10, height: 10, borderRadius: 5 },
  museumTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  museumTagText: { fontSize: 11, fontWeight: '700' },
  museumCardBody: { padding: 12 },
  museumName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  museumCity: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  museumExhibits: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  exhibitSection: { paddingHorizontal: 20, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardThumb: { width: 90, height: 90, backgroundColor: '#E6F4FE' },
  cardContent: { flex: 1, padding: 14, justifyContent: 'center' },
  cardCategory: { fontSize: 11, color: '#1A6FA8', fontWeight: '600', textTransform: 'uppercase' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 4 },
  cardEra: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
