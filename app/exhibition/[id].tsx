import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExhibitionDetail } from '../../src/hooks/useExhibitionDetail';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { C } from '../../src/theme/colors';
import { formatExhibitionDates } from '../../src/utils/exhibitionDates';

export default function ExhibitionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { exhibition, exhibits, loading } = useExhibitionDetail(id);

  if (!exhibition) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={C.accent} />
          ) : (
            <Text style={styles.emptyText}>{t('exhibition.notFound')}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const dates = formatExhibitionDates(exhibition, lang);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {exhibition.thumbnailUrl ? (
            <Image
              source={{ uri: exhibition.thumbnailUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroEmoji}>🏛️</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.kicker}>{t('content.exhibition')}</Text>
          <Text style={styles.title}>{exhibition.name || `Exhibition #${exhibition.id}`}</Text>
          {dates ? <Text style={styles.dates}>{dates}</Text> : null}

          {exhibition.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('exhibition.about')}</Text>
              <Text style={styles.description}>{exhibition.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('exhibition.exhibits')}</Text>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: 12 }} />
            ) : exhibits.length === 0 ? (
              <Text style={styles.emptyText}>{t('exhibition.emptyExhibits')}</Text>
            ) : (
              exhibits.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.exhibitRow}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/exhibit/${item.id}`)}
                >
                  <View style={[styles.exhibitThumb, { backgroundColor: item.color + '18' }]}>
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.exhibitThumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.exhibitEmoji}>{item.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.exhibitInfo}>
                    <Text style={styles.exhibitCategory}>{item.category}</Text>
                    <Text style={styles.exhibitTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.era ? <Text style={styles.exhibitEra}>{item.era}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 200, backgroundColor: C.bgElevated },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 56 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 6,
    lineHeight: 30,
  },
  dates: { fontSize: 13, color: C.textMuted, marginTop: 8 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
  description: { fontSize: 15, color: C.textSecondary, lineHeight: 24 },
  exhibitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  exhibitThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exhibitThumbImage: { width: '100%', height: '100%' },
  exhibitEmoji: { fontSize: 24 },
  exhibitInfo: { flex: 1, marginLeft: 12 },
  exhibitCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    textTransform: 'uppercase',
  },
  exhibitTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: 2 },
  exhibitEra: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  emptyText: { color: C.textMuted, fontSize: 14 },
});
