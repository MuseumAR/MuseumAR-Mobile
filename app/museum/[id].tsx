import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ARPackCard } from '../../src/components/ARPackCard';
import { getPacksByMuseum } from '../../src/data/arPacks';
import { useARPacks } from '../../src/hooks/useARPacks';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MUSEUM_DATA: Record<
  string,
  {
    name: string;
    city: string;
    address: string;
    phone: string;
    openHours: string;
    closedDay: string;
    ticketPrice: string;
    exhibits: number;
    founded: string;
    tag: string;
    color: string;
    description: string;
    highlights: string[];
    zones: { name: string; floor: string; items: number }[];
  }
> = {
  m1: {
    name: 'Bảo tàng Lịch sử Quốc gia',
    city: 'Hà Nội',
    address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    phone: '024 3825 2853',
    openHours: '8:00 – 17:00',
    closedDay: 'Thứ Hai',
    ticketPrice: '30.000 đ / người',
    exhibits: 200000,
    founded: '1958',
    tag: 'Lịch sử',
    color: '#1A6FA8',
    description:
      'Bảo tàng Lịch sử Quốc gia là nơi lưu giữ và trưng bày hơn 200.000 hiện vật phản ánh toàn bộ tiến trình lịch sử Việt Nam từ thời tiền sử đến thời hiện đại. Đây là một trong những bảo tàng lớn nhất và quan trọng nhất tại Việt Nam.',
    highlights: [
      'Trống đồng Đông Sơn niên đại 2.500 năm',
      'Bộ sưu tập gốm sứ các thời đại',
      'Hiện vật thời Hùng Vương dựng nước',
      'Trải nghiệm AR tại 3 khu vực đặc biệt',
    ],
    zones: [
      { name: 'Tiền sử - Sơ sử', floor: 'Tầng 1', items: 450 },
      { name: 'Văn hóa Đông Sơn', floor: 'Tầng 1', items: 320 },
      { name: 'Các vương triều phong kiến', floor: 'Tầng 2', items: 580 },
      { name: 'Cận - Hiện đại', floor: 'Tầng 3', items: 290 },
    ],
  },
  m2: {
    name: 'Bảo tàng Chứng tích Chiến tranh',
    city: 'TP. Hồ Chí Minh',
    address: '28 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
    phone: '028 3930 5587',
    openHours: '7:30 – 18:00',
    closedDay: 'Không đóng cửa',
    ticketPrice: '40.000 đ / người',
    exhibits: 20000,
    founded: '1975',
    tag: 'Chiến tranh',
    color: '#DC2626',
    description:
      'Bảo tàng Chứng tích Chiến tranh lưu giữ và trưng bày các tài liệu, hình ảnh và hiện vật về cuộc kháng chiến chống Mỹ cứu nước. Đây là một trong những điểm tham quan được du khách nước ngoài ghé thăm nhiều nhất tại Việt Nam.',
    highlights: [
      'Phòng tội ác chiến tranh với hình ảnh tư liệu quý hiếm',
      'Khu trưng bày vũ khí và phương tiện chiến tranh ngoài trời',
      'Bộ sưu tập ảnh của phóng viên chiến trường quốc tế',
      'Hệ thống tái hiện nhà tù Côn Đảo',
    ],
    zones: [
      { name: 'Tội ác chiến tranh', floor: 'Tầng 1', items: 180 },
      { name: 'Hậu quả chất độc da cam', floor: 'Tầng 2', items: 120 },
      { name: 'Phóng viên chiến trường', floor: 'Tầng 3', items: 210 },
      { name: 'Vũ khí - Thiết bị', floor: 'Ngoài trời', items: 95 },
    ],
  },
  m3: {
    name: 'Bảo tàng Dân tộc học Việt Nam',
    city: 'Hà Nội',
    address: 'Đường Nguyễn Văn Huyên, Cầu Giấy, Hà Nội',
    phone: '024 3756 2193',
    openHours: '8:30 – 17:30',
    closedDay: 'Thứ Hai',
    ticketPrice: '40.000 đ / người',
    exhibits: 15000,
    founded: '1997',
    tag: 'Văn hóa',
    color: '#059669',
    description:
      'Bảo tàng Dân tộc học Việt Nam giới thiệu văn hóa, đời sống và phong tục tập quán của 54 dân tộc anh em trên lãnh thổ Việt Nam. Khuôn viên bảo tàng rộng lớn với các công trình kiến trúc nhà sàn truyền thống được phục dựng nguyên bản.',
    highlights: [
      'Nhà sàn truyền thống của 10 dân tộc thiểu số',
      'Không gian văn hóa người Kinh xưa',
      'Bộ trang phục 54 dân tộc Việt Nam',
      'Biểu diễn nhạc cụ dân tộc cuối tuần',
    ],
    zones: [
      { name: 'Người Kinh', floor: 'Tầng 1', items: 340 },
      { name: 'Dân tộc Tây Bắc', floor: 'Tầng 2', items: 280 },
      { name: 'Dân tộc Tây Nguyên', floor: 'Tầng 2', items: 260 },
      { name: 'Nhà truyền thống', floor: 'Ngoài trời', items: 10 },
    ],
  },
  m4: {
    name: 'Bảo tàng Điêu khắc Chăm',
    city: 'Đà Nẵng',
    address: '2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng',
    phone: '0236 3572 935',
    openHours: '7:00 – 17:00',
    closedDay: 'Không đóng cửa',
    ticketPrice: '60.000 đ / người',
    exhibits: 2000,
    founded: '1919',
    tag: 'Điêu khắc',
    color: '#D97706',
    description:
      'Bảo tàng Điêu khắc Chăm Đà Nẵng là nơi lưu giữ bộ sưu tập điêu khắc Champa lớn nhất thế giới. Các hiện vật được khai quật từ các thánh địa Champa như Mỹ Sơn, Trà Kiệu, Đồng Dương thể hiện nghệ thuật đỉnh cao của vương quốc Champa hưng thịnh.',
    highlights: [
      'Tượng thần Shiva từ thánh địa Mỹ Sơn',
      'Đài thờ Trà Kiệu thế kỷ X',
      'Bộ sưu tập Linga - Yoni',
      'Tượng vũ nữ Apsara độc đáo',
    ],
    zones: [
      { name: 'Phòng Mỹ Sơn', floor: 'Tầng 1', items: 180 },
      { name: 'Phòng Trà Kiệu', floor: 'Tầng 1', items: 120 },
      { name: 'Phòng Đồng Dương', floor: 'Tầng 2', items: 95 },
      { name: 'Phòng Tháp Mẫm', floor: 'Tầng 2', items: 85 },
    ],
  },
  m5: {
    name: 'Bảo tàng Mỹ thuật Việt Nam',
    city: 'Hà Nội',
    address: '66 Nguyễn Thái Học, Ba Đình, Hà Nội',
    phone: '024 3823 3084',
    openHours: '8:30 – 17:00',
    closedDay: 'Thứ Hai',
    ticketPrice: '40.000 đ / người',
    exhibits: 17000,
    founded: '1966',
    tag: 'Nghệ thuật',
    color: '#7C3AED',
    description:
      'Bảo tàng Mỹ thuật Việt Nam là nơi lưu giữ và trưng bày các tác phẩm nghệ thuật tiêu biểu của Việt Nam qua các thời kỳ, từ nghệ thuật cổ đại đến hiện đại. Bảo tàng là điểm đến không thể bỏ qua đối với những ai yêu thích hội họa và điêu khắc.',
    highlights: [
      'Tranh sơn mài - đặc sản nghệ thuật Việt Nam',
      'Tác phẩm của danh họa Tô Ngọc Vân, Nguyễn Phan Chánh',
      'Điêu khắc dân gian đình làng Bắc Bộ',
      'Nghệ thuật hiện đại và đương đại Việt Nam',
    ],
    zones: [
      { name: 'Mỹ thuật cổ đại', floor: 'Tầng 1', items: 220 },
      { name: 'Mỹ thuật dân gian', floor: 'Tầng 1', items: 180 },
      { name: 'Hội họa hiện đại', floor: 'Tầng 2', items: 310 },
      { name: 'Nghệ thuật đương đại', floor: 'Tầng 3', items: 150 },
    ],
  },
};

export default function MuseumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const museum = MUSEUM_DATA[id ?? ''];
  const [favorited, setFavorited] = useState(false);
  const { downloadPack, deletePack, getState } = useARPacks();
  const arPacks = getPacksByMuseum(id ?? '');

  if (!museum) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Không tìm thấy bảo tàng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: museum.color + '25' }]}>
          <View style={[styles.heroIconBg, { backgroundColor: museum.color + '30' }]}>
            <View style={[styles.heroIconDot, { backgroundColor: museum.color }]} />
          </View>
          <View style={[styles.heroTag, { backgroundColor: museum.color + '30' }]}>
            <Text style={[styles.heroTagText, { color: museum.color }]}>{museum.tag}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Name & City */}
          <Text style={styles.name}>{museum.name}</Text>
          <Text style={styles.city}>{museum.city} · Thành lập {museum.founded}</Text>

          {/* Action grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/ticket')}>
              <MaterialCommunityIcons name="ticket-outline" size={28} color={museum.color} />
              <Text style={styles.actionLabel}>Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/scan')}>
              <MaterialCommunityIcons name="yin-yang" size={28} color={museum.color} />
              <Text style={styles.actionLabel}>Artifact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => setFavorited((v) => !v)}>
              <MaterialCommunityIcons
                name={favorited ? 'heart' : 'heart-outline'}
                size={28}
                color={favorited ? '#EF4444' : museum.color}
              />
              <Text style={[styles.actionLabel, favorited && { color: '#EF4444' }]}>Favorite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/ar-packs')}>
              <MaterialCommunityIcons name="package-variant-closed" size={28} color={museum.color} />
              <Text style={styles.actionLabel}>Package</Text>
            </TouchableOpacity>
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: museum.color }]}>
                {museum.exhibits.toLocaleString('vi-VN')}
              </Text>
              <Text style={styles.statLabel}>Hiện vật</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: museum.color }]}>
                {museum.zones.length}
              </Text>
              <Text style={styles.statLabel}>Khu trưng bày</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: museum.color }]}>AR</Text>
              <Text style={styles.statLabel}>Hỗ trợ</Text>
            </View>
          </View>

          {/* Info cards */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>{museum.address}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>⏰</Text>
              <Text style={styles.infoLabel}>Giờ mở cửa</Text>
              <Text style={styles.infoValue}>{museum.openHours}</Text>
              <Text style={styles.infoNote}>Đóng cửa: {museum.closedDay}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🎫</Text>
              <Text style={styles.infoLabel}>Vé tham quan</Text>
              <Text style={styles.infoValue}>{museum.ticketPrice}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={styles.infoLabel}>Liên hệ</Text>
              <Text style={styles.infoValue}>{museum.phone}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giới thiệu</Text>
            <Text style={styles.description}>{museum.description}</Text>
          </View>

          {/* Highlights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Điểm nổi bật</Text>
            {museum.highlights.map((item, index) => (
              <View key={index} style={styles.highlightRow}>
                <View style={[styles.highlightDot, { backgroundColor: museum.color }]} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Zones */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khu trưng bày</Text>
            {museum.zones.map((zone, index) => (
              <View key={index} style={styles.zoneCard}>
                <View style={[styles.zoneBar, { backgroundColor: museum.color }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneMeta}>{zone.floor}</Text>
                </View>
                <View style={[styles.zoneBadge, { backgroundColor: museum.color + '20' }]}>
                  <Text style={[styles.zoneBadgeText, { color: museum.color }]}>
                    {zone.items} hiện vật
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* AR Packs */}
          <View style={styles.section}>
            <View style={styles.arPacksHeader}>
              <Text style={styles.sectionTitle}>Gói AR có thể tải</Text>
              <TouchableOpacity onPress={() => router.push('/ar-packs')}>
                <Text style={styles.seeAll}>Xem tất cả</Text>
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

          {/* CTA */}
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: museum.color }]}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Text style={styles.mapBtnText}>📍  Xem trên bản đồ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arBtn, { borderColor: museum.color }]}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Text style={[styles.arBtnText, { color: museum.color }]}>
              📱  Bắt đầu trải nghiệm AR
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#9CA3AF' },

  hero: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIconDot: { width: 28, height: 28, borderRadius: 14 },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroTagText: { fontSize: 13, fontWeight: '700' },

  content: { padding: 24 },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', lineHeight: 32 },
  city: { fontSize: 14, color: '#6B7280', marginTop: 6 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#F3F4F6' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  infoCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  infoIcon: { fontSize: 18, marginBottom: 7 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 4, lineHeight: 18 },
  infoNote: { fontSize: 11, color: '#EF4444', marginTop: 4 },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  description: { fontSize: 15, color: '#374151', lineHeight: 26 },

  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  highlightDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7, marginRight: 12 },
  highlightText: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 22 },

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
  zoneBar: { width: 4, height: 56 },
  zoneInfo: { flex: 1, paddingHorizontal: 14 },
  zoneName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  zoneMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  zoneBadge: { marginRight: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  zoneBadgeText: { fontSize: 12, fontWeight: '700' },

  mapBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  mapBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  arBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  arBtnText: { fontWeight: '700', fontSize: 16 },
  arPacksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 14, color: '#1A6FA8', fontWeight: '600' },

  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 4,
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
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
});
