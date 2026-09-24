import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

type CategoryFilter = { kind: 'all' } | { kind: 'category'; id: number; name: string };

type TagFilter =
  | { kind: 'all' }
  | { kind: 'tagGroup'; id: number; name: string }
  | { kind: 'tag'; id: number; name: string; groupId: number };

function ChipRow({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.chipRowWrap}>
      {label ? <Text style={styles.chipRowLabel}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const paramCategoryId = parseNumericId(params.categoryId);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>({ kind: 'all' });
  const [tagFilter, setTagFilter] = useState<TagFilter>({ kind: 'all' });
  const { track } = useTrackAction();
  const searchTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { categories, tagGroups, tags, ALL_LABEL } = useCategories();
  const { exhibits, loading, error, refresh: refreshExhibits } = useExhibits();
  const {
    tagIdsByExhibit,
    loading: tagIndexLoading,
    refresh: refreshTagIndex,
  } = useExhibitTagIndex(exhibits);

  const refresh = async () => {
    await Promise.all([refreshExhibits(), refreshTagIndex()]);
  };

  const categoryChips: TaxonomyChip[] = useMemo(
    () =>
      categories
        .filter((c) => c.name)
        .map((c) => ({
          key: `category:${c.id}`,
          id: c.id,
          name: c.name as string,
          kind: 'category' as const,
        })),
    [categories],
  );

  /** Prefer tag groups; fall back to flat tags when groups unavailable. */
  const tagPrimaryChips: TaxonomyChip[] = useMemo(
    () => (tagGroups.length > 0 ? tagGroups : tags),
    [tagGroups, tags],
  );

  useEffect(() => {
    if (paramCategoryId != null) {
      const cat = categories.find((c) => c.id === paramCategoryId);
      if (cat?.name) {
        setCategoryFilter({ kind: 'category', id: cat.id, name: cat.name });
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
    tagFilter.kind === 'tagGroup'
      ? tagFilter.id
      : tagFilter.kind === 'tag'
        ? tagFilter.groupId
        : null;

  const tagsInGroup = useMemo(
    () =>
      selectedGroupId == null || tagGroups.length === 0
        ? []
        : tags.filter((tag) => tag.tagGroupId === selectedGroupId),
    [tags, selectedGroupId, tagGroups.length],
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
        let matchCategory = true;
        if (categoryFilter.kind === 'category') {
          matchCategory =
            e.categoryId === categoryFilter.id ||
            e.category === categoryFilter.name;
        }

        let matchTag = true;
        if (tagFilter.kind === 'tagGroup' || tagFilter.kind === 'tag') {
          const exhibitTags = tagIdsByExhibit.get(Number(e.id));
          if (exhibitTags == null) {
            matchTag = tagIndexLoading || tagsPending;
          } else if (tagFilter.kind === 'tagGroup') {
            matchTag =
              tagGroups.length > 0
                ? exhibitTags.some((id) => tagIdsInGroup.has(id))
                : exhibitTags.includes(tagFilter.id);
          } else {
            matchTag = exhibitTags.includes(tagFilter.id);
          }
        }

        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchTag && matchSearch;
      }),
    [
      exhibits,
      categoryFilter,
      tagFilter,
      search,
      tagIdsByExhibit,
      tagIdsInGroup,
      tagIndexLoading,
      tagsPending,
      tagGroups.length,
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

      {/* Row 1 — categories */}
      <ChipRow label={t('explore.filterCategory')}>
        <FilterChip
          label={ALL_LABEL}
          active={categoryFilter.kind === 'all'}
          onPress={() => setCategoryFilter({ kind: 'all' })}
        />
        {categoryChips.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.name}
            active={
              categoryFilter.kind === 'category' &&
              categoryFilter.id === chip.id
            }
            onPress={() =>
              setCategoryFilter({
                kind: 'category',
                id: chip.id,
                name: chip.name,
              })
            }
          />
        ))}
      </ChipRow>

      {/* Row 2 — tag groups (or flat tags) */}
      {tagPrimaryChips.length > 0 ? (
        <ChipRow label={t('explore.filterTags')}>
          <FilterChip
            label={ALL_LABEL}
            active={tagFilter.kind === 'all'}
            onPress={() => setTagFilter({ kind: 'all' })}
          />
          {tagPrimaryChips.map((chip) => {
            const active =
              chip.kind === 'tagGroup'
                ? (tagFilter.kind === 'tagGroup' && tagFilter.id === chip.id) ||
                  (tagFilter.kind === 'tag' && tagFilter.groupId === chip.id)
                : tagFilter.kind === 'tag' && tagFilter.id === chip.id;
            return (
              <FilterChip
                key={chip.key}
                label={chip.name}
                active={active}
                onPress={() => {
                  if (chip.kind === 'tagGroup') {
                    setTagFilter({
                      kind: 'tagGroup',
                      id: chip.id,
                      name: chip.name,
                    });
                    return;
                  }
                  setTagFilter({
                    kind: 'tag',
                    id: chip.id,
                    name: chip.name,
                    groupId: chip.tagGroupId ?? chip.id,
                  });
                }}
              />
            );
          })}
        </ChipRow>
      ) : null}

      {/* Row 3 — tags inside selected group */}
      {tagsInGroup.length > 0 ? (
        <ChipRow label={t('explore.selectTag')}>
          {tagsInGroup.map((tag) => (
            <FilterChip
              key={tag.key}
              label={tag.name}
              active={tagFilter.kind === 'tag' && tagFilter.id === tag.id}
              onPress={() =>
                setTagFilter({
                  kind: 'tag',
                  id: tag.id,
                  name: tag.name,
                  groupId: tag.tagGroupId ?? selectedGroupId ?? tag.id,
                })
              }
            />
          ))}
        </ChipRow>
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
  chipRowWrap: {
    minHeight: 44,
    marginBottom: 2,
  },
  chipRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  chipScroll: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
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
