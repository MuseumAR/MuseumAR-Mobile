import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EXHIBIT_DATA: Record<
  string,
  {
    title: string;
    era: string;
    category: string;
    origin: string;
    material: string;
    description: string;
    arAvailable: boolean;
  }
> = {
  '1': {
    title: 'Trống đồng Đông Sơn',
    era: 'Thế kỷ VII - I TCN',
    category: 'Đồ đồng',
    origin: 'Miền Bắc Việt Nam',
    material: 'Đồng thau',
    description:
      'Trống đồng Đông Sơn là biểu tượng văn hóa nổi bật của nền văn minh Đông Sơn. Những chiếc trống này được đúc bằng kỹ thuật tinh xảo, trang trí các hoa văn hình học và cảnh sinh hoạt của người Việt cổ. Trống đồng không chỉ là nhạc cụ mà còn là vật thiêng trong các nghi lễ tâm linh.',
    arAvailable: true,
  },
  '2': {
    title: 'Tượng Phật Đồng Dương',
    era: 'Thế kỷ IX',
    category: 'Điêu khắc',
    origin: 'Quảng Nam',
    material: 'Đá sa thạch',
    description:
      'Tượng Phật Đồng Dương là kiệt tác điêu khắc Champa, được khai quật tại khu phế tích Đồng Dương, Quảng Nam. Tượng thể hiện phong cách nghệ thuật đặc trưng của vương quốc Champa thế kỷ IX với những đường nét tinh tế và biểu cảm sâu sắc.',
    arAvailable: false,
  },
  '3': {
    title: 'Gốm Chu Đậu',
    era: 'Thế kỷ XIV - XV',
    category: 'Gốm sứ',
    origin: 'Hải Dương',
    material: 'Gốm men',
    description:
      'Gốm Chu Đậu là dòng gốm cao cấp được sản xuất tại làng Chu Đậu, Hải Dương. Nổi tiếng với nước men trắng ngà và họa tiết hoa lam tinh tế, gốm Chu Đậu từng được xuất khẩu sang nhiều nước châu Á và châu Âu trong thời Trung đại.',
    arAvailable: true,
  },
};

type ActionItem = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
};

export default function ExhibitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const exhibit = EXHIBIT_DATA[id ?? '1'];
  const [favorited, setFavorited] = useState(false);

  if (!exhibit) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Không tìm thấy hiện vật</Text>
        </View>
      </SafeAreaView>
    );
  }

  const actions: ActionItem[] = [
    {
      icon: 'ticket-outline',
      label: 'Ticket',
      onPress: () => router.push('/(tabs)/ticket'),
    },
    {
      icon: 'yin-yang',
      label: 'Artifact',
      onPress: () => router.push('/(tabs)/scan'),
    },
    {
      icon: favorited ? 'heart' : 'heart-outline',
      label: 'Favorite',
      onPress: () => setFavorited((v) => !v),
      active: favorited,
      activeColor: '#EF4444',
    },
    {
      icon: 'package-variant-closed',
      label: 'Package',
      onPress: () => router.push('/ar-packs'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero image placeholder */}
        <View style={styles.hero}>
          <Text style={styles.heroCategory}>{exhibit.category}</Text>
          <Text style={styles.heroHint}>Hình ảnh hiện vật</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{exhibit.title}</Text>
          <Text style={styles.era}>{exhibit.era}</Text>

          {/* Action grid — 4 nút nằm trong nội dung */}
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={28}
                  color={action.active ? action.activeColor : '#1A6FA8'}
                />
                <Text style={[styles.actionLabel, action.active && { color: action.activeColor }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AR Button */}
          {exhibit.arAvailable && (
            <TouchableOpacity
              style={styles.arBtn}
              onPress={() => router.push('/(tabs)/scan')}
            >
              <MaterialCommunityIcons name="augmented-reality" size={22} color="#FFFFFF" />
              <Text style={styles.arBtnText}>Xem mô hình AR 3D</Text>
            </TouchableOpacity>
          )}

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nguồn gốc</Text>
              <Text style={styles.infoValue}>{exhibit.origin}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Chất liệu</Text>
              <Text style={styles.infoValue}>{exhibit.material}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>Giới thiệu</Text>
            <Text style={styles.descText}>{exhibit.description}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  scrollContent: { paddingBottom: 32 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#9CA3AF' },
  hero: {
    width: '100%',
    height: 260,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6FA8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroHint: { color: '#9CA3AF', fontSize: 14 },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  era: { fontSize: 15, color: '#6B7280', marginTop: 6, marginBottom: 20 },

  /* 4 action cards */
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  arBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A6FA8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  arBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 6 },
  descSection: { marginTop: 4 },
  descTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  descText: { fontSize: 15, color: '#374151', lineHeight: 26 },
});
