import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExhibitions } from '../../src/hooks/useExhibitions';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useLanguage } from '../../src/i18n/LanguageContext';
import type { ExhibitionDto } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';
import { formatExhibitionDates } from '../../src/utils/exhibitionDates';

export default function ExhibitionsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { museum } = useMuseumProfile();
  const museumId = Number(museum.id) || 0;
  const { exhibitions, loading, error, refresh } = useExhibitions(
    museumId > 0 ? museumId : null,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={exhibitions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={loading}
        renderItem={({ item }) => (
          <ExhibitionRow
            item={item}
            dates={formatExhibitionDates(item, lang)}
            onPress={() => router.push(`/exhibition/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{error ?? t('home.noExhibitions')}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function ExhibitionRow({
  item,
  dates,
  onPress,
}: {
  item: ExhibitionDto;
  dates: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbEmoji}>🏛️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.kicker}>{item.status || 'Active'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.name || `Exhibition #${item.id}`}
        </Text>
        {dates ? <Text style={styles.dates}>{dates}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  thumb: { width: 96, height: 96, backgroundColor: C.bgElevated },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 28 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  dates: { fontSize: 12, color: C.textMuted, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: C.textMuted, fontSize: 15 },
});
