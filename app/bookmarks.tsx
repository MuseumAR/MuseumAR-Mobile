import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExhibitListItem } from '../src/components/ExhibitListItem';
import { useBookmarks } from '../src/hooks/useBookmarks';
import { useExhibits } from '../src/hooks/useExhibits';
import { C } from '../src/theme/colors';
import { formatVisitorDate } from '../src/utils/visitorLists';

export default function BookmarksScreen() {
  const router = useRouter();
  const { bookmarks, loading, refresh } = useBookmarks();
  const { exhibits, loading: exhibitsLoading, refresh: refreshExhibits } = useExhibits();

  const exhibitById = useMemo(
    () => new Map(exhibits.map((e) => [Number(e.id), e])),
    [exhibits],
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshExhibits();
    }, [refresh, refreshExhibits]),
  );

  const listLoading = loading || exhibitsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => String(item.exhibitId)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.headerHint}>
            {bookmarks.length} hiện vật đã lưu
          </Text>
        }
        ListEmptyComponent={
          listLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Chưa có hiện vật đã lưu</Text>
              <Text style={styles.emptyText}>
                Nhấn biểu tượng trái tim trên trang chi tiết hiện vật để lưu vào danh sách.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Text style={styles.emptyBtnText}>Khám phá hiện vật</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ExhibitListItem
            exhibitId={item.exhibitId}
            exhibit={exhibitById.get(item.exhibitId)}
            subtitle={`Đã lưu: ${formatVisitorDate(item.createdAt)}`}
            onPress={() => router.push(`/exhibit/${item.exhibitId}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  list: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  headerHint: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 16,
  },
  center: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 14 },
});
