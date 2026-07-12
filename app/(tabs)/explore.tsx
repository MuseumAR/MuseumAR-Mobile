import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { C } from '../../src/theme/colors';
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
import { EXHIBITS, EXHIBIT_CATEGORIES } from '../../src/data/exhibits';
import { useTrackAction } from '../../src/hooks/useTrackAction';

export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const { track } = useTrackAction();
  const searchTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CATEGORIES = EXHIBIT_CATEGORIES;

  useEffect(() => {
    if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
    if (search.trim().length < 2) return;
    searchTrackTimer.current = setTimeout(() => {
      track({ actionType: 'Search', searchQuery: search.trim() });
    }, 800);
    return () => {
      if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
    };
  }, [search, track]);

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
          placeholderTextColor={C.textPlaceholder}
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
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  search: {
    backgroundColor: C.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.textPrimary,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoriesScroll: { flexGrow: 0 },
  categories: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  categoryText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  categoryTextActive: { color: C.onAccent },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  gridThumb: { width: '100%', height: 120, backgroundColor: C.bgElevated },
  gridContent: { padding: 12 },
  gridCategory: { fontSize: 10, color: C.accent, fontWeight: '700', textTransform: 'uppercase' },
  gridTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  gridEra: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: C.textMuted, fontSize: 15 },
});
