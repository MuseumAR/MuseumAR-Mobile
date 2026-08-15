import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnalyticsAction } from '../../src/constants/analyticsActions';
import { useCategories } from '../../src/hooks/useCategories';
import { useExhibitTagIndex } from '../../src/hooks/useExhibitTagIndex';
import { useExhibits } from '../../src/hooks/useExhibits';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useLanguage } from '../../src/i18n/LanguageContext';
import type { TaxonomyChip } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

type SelectedFilter =
  | { kind: 'all' }
  | { kind: 'category' | 'tagGroup'; id: number; name: string }
  | { kind: 'tag'; id: number; name: string; groupId: number };

function primaryChipActive(filter: SelectedFilter, chip: TaxonomyChip): boolean {
  if (filter.kind === 'all') return false;
  if (chip.kind === 'tagGroup') {
    if (filter.kind === 'tagGroup') return filter.id === chip.id;
    if (filter.kind === 'tag') return filter.groupId === chip.id;
    return false;
  }
  return filter.kind === chip.kind && filter.id === chip.id;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const paramCategoryId = parseNumericId(params.categoryId);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SelectedFilter>({ kind: 'all' });
  const { track } = useTrackAction();
  const searchTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { filterChips, categories, tags, ALL_LABEL } = useCategories();
  const { exhibits, loading, error, refresh: refreshExhibits } = useExhibits();
  const {
    tagIdsByExhibit,
    loading: tagIndexLoading,
    refresh: refreshTagIndex,
  } = useExhibitTagIndex(exhibits);

  const refresh = async () => {
    await Promise.all([refreshExhibits(), refreshTagIndex()]);
  };

  useEffect(() => {
    if (paramCategoryId != null) {
      const cat = categories.find((c) => c.id === paramCategoryId);
      if (cat?.name) {
        setSelected({ kind: 'category', id: cat.id, name: cat.name });
      }
    }
  }, [paramCategoryId, categories]);

  useEffect(() => {
    if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
    if (search.trim().length < 2) return;
    searchTrackTimer.current = setTimeout(() => {
      track({
        actionType: AnalyticsAction.SEARCH,
        searchQuery: search.trim(),
        languageUsed: lang,
      });
    }, 800);
    return () => {
      if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
    };
  }, [search, track, lang]);

  const selectedGroupId =
    selected.kind === 'tagGroup'
      ? selected.id
      : selected.kind === 'tag'
        ? selected.groupId
        : null;

  const tagsInGroup = useMemo(
    () =>
      selectedGroupId == null
        ? []
        : tags.filter((tag) => tag.tagGroupId === selectedGroupId),
    [tags, selectedGroupId],
  );

  const tagIdsInGroup = useMemo(
    () => new Set(tagsInGroup.map((tag) => tag.id)),
    [tagsInGroup],
  );

  const tagsPending = exhibits.some(
    (e) => !tagIdsByExhibit.has(Number(e.id)),
  );

  const filtered = useMemo(
    () =>
      exhibits.filter((e) => {
        let matchTaxonomy = true;
        if (selected.kind === 'category') {
          matchTaxonomy = e.categoryId === selected.id || e.category === selected.name;
        } else if (selected.kind === 'tagGroup' || selected.kind === 'tag') {
          const exhibitTags = tagIdsByExhibit.get(Number(e.id));
          if (exhibitTags == null) {
            matchTaxonomy = tagIndexLoading || tagsPending;
          } else if (selected.kind === 'tagGroup') {
            matchTaxonomy = exhibitTags.some((id) => tagIdsInGroup.has(id));
          } else {
            matchTaxonomy = exhibitTags.includes(selected.id);
          }
        }
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
        return matchTaxonomy && matchSearch;
      }),
    [
      exhibits,
      selected,
      search,
      tagIdsByExhibit,
      tagIdsInGroup,
      tagIndexLoading,
      tagsPending,
    ],
  );

  const listHeader = (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{t('explore.title')}</Text>
        <TextInput
          style={styles.search}
          placeholder={t('explore.search')}
          placeholderTextColor={C.textPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.categoriesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <TouchableOpacity
            style={[styles.categoryChip, selected.kind === 'all' && styles.categoryChipActive]}
            onPress={() => setSelected({ kind: 'all' })}
          >
            <Text
              style={[styles.categoryText, selected.kind === 'all' && styles.categoryTextActive]}
              numberOfLines={1}
            >
              {ALL_LABEL}
            </Text>
          </TouchableOpacity>
          {filterChips.map((chip) => {
            const active = primaryChipActive(selected, chip);
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => {
                  if (chip.kind !== 'category' && chip.kind !== 'tagGroup') return;
                  setSelected({ kind: chip.kind, id: chip.id, name: chip.name });
                }}
              >
                <Text
                  style={[styles.categoryText, active && styles.categoryTextActive]}
                  numberOfLines={1}
                >
                  {chip.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {tagsInGroup.length > 0 ? (
        <View style={styles.tagRowWrap}>
          <Text style={styles.tagRowLabel}>{t('explore.selectTag')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {tagsInGroup.map((tag) => {
              const active = selected.kind === 'tag' && selected.id === tag.id;
              return (
                <TouchableOpacity
                  key={tag.key}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() =>
                    setSelected({
                      kind: 'tag',
                      id: tag.id,
                      name: tag.name,
                      groupId: tag.tagGroupId ?? selectedGroupId ?? tag.id,
                    })
                  }
                >
                  <Text
                    style={[styles.categoryText, active && styles.categoryTextActive]}
                    numberOfLines={1}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        onRefresh={refresh}
        refreshing={loading || tagIndexLoading}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push(`/exhibit/${item.id}`)}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.gridThumb} resizeMode="cover" />
            ) : (
              <View
                style={[
                  styles.gridThumb,
                  { backgroundColor: item.color + '22', alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <Text style={{ fontSize: 34 }}>{item.emoji}</Text>
              </View>
            )}
            <View style={styles.gridContent}>
              <Text style={styles.gridCategory}>{item.category}</Text>
              <Text style={styles.gridTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.era ? <Text style={styles.gridEra}>{item.era}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{error ?? t('explore.empty')}</Text>
            </View>
          )
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
  categoriesWrap: {
    minHeight: 52,
    marginBottom: 4,
  },
  tagRowWrap: {
    minHeight: 52,
    marginBottom: 8,
  },
  tagRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  categories: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categoryChip: {
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
