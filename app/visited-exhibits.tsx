import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
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
import { useVisitedExhibits } from '../src/hooks/useVisitedExhibits';
import { C } from '../src/theme/colors';
import { formatVisitorDate } from '../src/utils/visitorLists';

export default function VisitedExhibitsScreen() {
  const router = useRouter();
  const { visited, loading, refresh } = useVisitedExhibits();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={visited}
        keyExtractor={(item) => String(item.exhibitId)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.headerHint}>
            {visited.length} hiện vật đã xem
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Chưa có lịch sử tham quan</Text>
              <Text style={styles.emptyText}>
                Mở chi tiết hiện vật để bắt đầu lưu lịch sử xem của bạn.
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
            subtitle={`Xem lần cuối: ${formatVisitorDate(item.visitedAt)}${
              item.timeSpentSeconds != null ? ` · ${item.timeSpentSeconds}s` : ''
            }`}
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
  emptyBtnText: { color: '#080A14', fontWeight: '700', fontSize: 14 },
});
