import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCategories } from '../../src/hooks/useCategories';
import { useExhibitions } from '../../src/hooks/useExhibitions';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useLanguage } from '../../src/i18n/LanguageContext';
import type { ExhibitionDto } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';
import { formatExhibitionDates } from '../../src/utils/exhibitionDates';
import { parseNumericId } from '../../src/utils/parseId';

export default function ExhibitionsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const params = useLocalSearchParams<{ themeId?: string }>();
  const paramThemeId = parseNumericId(params.themeId);
  const { museum } = useMuseumProfile();
  const museumId = Number(museum.id) || 0;
  const { exhibitions, loading, error, refresh } = useExhibitions(
    museumId > 0 ? museumId : null,
  );
  const { themes, ALL_LABEL } = useCategories();
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);

  useEffect(() => {
    if (paramThemeId != null) setSelectedThemeId(paramThemeId);
  }, [paramThemeId]);

  const themeNameById = useMemo(() => {
    const map = new Map<number, string>();
    themes.forEach((theme) => map.set(theme.id, theme.name));
    return map;
  }, [themes]);

  const filtered = useMemo(() => {
    if (selectedThemeId == null) return exhibitions;
    return exhibitions.filter((item) => Number(item.themeId) === selectedThemeId);
  }, [exhibitions, selectedThemeId]);

  const listHeader =
    themes.length > 0 ? (
      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            style={[styles.chip, selectedThemeId == null && styles.chipActive]}
            onPress={() => setSelectedThemeId(null)}
          >
            <Text
              style={[styles.chipText, selectedThemeId == null && styles.chipTextActive]}
              numberOfLines={1}
            >
              {ALL_LABEL}
            </Text>
          </TouchableOpacity>
          {themes.map((theme) => {
            const active = selectedThemeId === theme.id;
            return (
              <TouchableOpacity
                key={theme.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedThemeId(theme.id)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {theme.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={loading}
        renderItem={({ item }) => (
          <ExhibitionRow
            item={item}
            themeName={
              item.themeId != null ? themeNameById.get(Number(item.themeId)) : undefined
            }
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
              <Text style={styles.emptyText}>
                {error ??
                  (selectedThemeId != null
                    ? t('exhibition.emptyFiltered')
                    : t('home.noExhibitions'))}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function ExhibitionRow({
  item,
  themeName,
  dates,
  onPress,
}: {
  item: ExhibitionDto;
  themeName?: string;
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
        <Text style={styles.kicker}>{themeName || item.status || 'Active'}</Text>
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
  list: { paddingBottom: 32 },
  chipsWrap: { minHeight: 52, marginBottom: 4 },
  chips: { paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  chipTextActive: { color: C.onAccent },
  card: {
    flexDirection: 'row',
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 16,
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
