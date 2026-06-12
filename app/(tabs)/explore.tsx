import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['Tất cả', 'Đồ đồng', 'Gốm sứ', 'Điêu khắc', 'Vũ khí', 'Trang sức'];

const EXHIBITS = [
  { id: '1', title: 'Trống đồng Đông Sơn', era: 'Thế kỷ VII-I TCN', category: 'Đồ đồng' },
  { id: '2', title: 'Tượng Phật Đồng Dương', era: 'Thế kỷ IX', category: 'Điêu khắc' },
  { id: '3', title: 'Gốm Chu Đậu', era: 'Thế kỷ XIV-XV', category: 'Gốm sứ' },
  { id: '4', title: 'Kiếm thời Trần', era: 'Thế kỷ XIII-XIV', category: 'Vũ khí' },
  { id: '5', title: 'Vòng đeo tay vàng Óc Eo', era: 'Thế kỷ I-VII', category: 'Trang sức' },
  { id: '6', title: 'Bình gốm Lý', era: 'Thế kỷ XI-XIII', category: 'Gốm sứ' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  const filtered = EXHIBITS.filter((e) => {
    const matchCategory =
      selectedCategory === 'Tất cả' || e.category === selectedCategory;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Khám phá</Text>
        <TextInput
          style={styles.search}
          placeholder="Tìm kiếm hiện vật..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filter — dùng ScrollView ngang thay FlatList để tránh lỗi chiều cao */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        style={styles.categoriesScroll}
      >
        {CATEGORIES.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exhibit grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push(`/exhibit/${item.id}`)}
          >
            <View style={styles.gridThumb} />
            <View style={styles.gridContent}>
              <Text style={styles.gridCategory}>{item.category}</Text>
              <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.gridEra}>{item.era}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Không tìm thấy hiện vật</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoriesScroll: { flexGrow: 0 },
  categories: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#1A6FA8', borderColor: '#1A6FA8' },
  categoryText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  categoryTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  gridThumb: { width: '100%', height: 120, backgroundColor: '#E6F4FE' },
  gridContent: { padding: 12 },
  gridCategory: { fontSize: 10, color: '#1A6FA8', fontWeight: '700', textTransform: 'uppercase' },
  gridTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  gridEra: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
