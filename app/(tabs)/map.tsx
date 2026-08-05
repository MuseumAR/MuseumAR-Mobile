import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { C } from '../../src/theme/colors';

export default function MuseumAboutScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { museum } = useMuseumProfile();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>{t('museum.about')}</Text>
            <Text style={styles.title}>{t('museum.title')}</Text>
            <Text style={styles.subtitle}>{museum.city}</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: C.accentDark, borderColor: C.accent + '40' }]}>
            <MaterialCommunityIcons name="bank-outline" size={22} color={C.accent} />
          </View>
        </View>

        {/* ── Hero card ────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={[styles.heroVisual, { backgroundColor: museum.color + '18' }]}>
            {museum.thumbnailUrl ? (
              <Image
                source={{ uri: museum.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.heroEmoji}>🏛</Text>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(247,242,233,0.95)']}
              style={styles.heroGradient}
            />
            {museum.tag ? (
              <View style={[styles.tagBadge, { borderColor: museum.color + '60' }]}>
                <Text style={[styles.tagText, { color: museum.color }]}>{museum.tag}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.museumName}>{museum.name}</Text>
            {museum.description ? (
              <Text style={styles.description}>{museum.description}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Info rows ────────────────────────────────────────────────── */}
        <View style={styles.infoSection}>
          {[
            {
              icon: 'clock-outline' as const,
              label: t('museum.hours'),
              value: museum.openHours,
              note: museum.closedDay
                ? `${t('museum.closed')}: ${museum.closedDay}`
                : undefined,
            },
            { icon: 'ticket-outline' as const, label: t('museum.ticket'), value: museum.ticketPrice },
            { icon: 'map-marker-outline' as const, label: t('museum.address'), value: museum.address },
            { icon: 'phone-outline' as const, label: t('museum.contact'), value: museum.phone },
          ].map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <MaterialCommunityIcons name={item.icon} size={18} color={C.accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
                {item.note ? <Text style={styles.infoNote}>{item.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        {/* ── Highlights ───────────────────────────────────────────────── */}
        {museum.highlights.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('museum.highlights')}</Text>
            <Text style={styles.sectionTitle}>{t('museum.mustSee')}</Text>
            {museum.highlights.map((item, i) => (
              <View key={i} style={styles.highlightRow}>
                <View style={[styles.highlightDot, { backgroundColor: museum.color }]} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Zones ────────────────────────────────────────────────────── */}
        {museum.zones.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('museum.zones')}</Text>
            <Text style={styles.sectionTitle}>{t('museum.zones')}</Text>
            {museum.zones.map((zone) => (
              <View key={zone.name} style={styles.zoneRow}>
                <View style={[styles.zoneIcon, { backgroundColor: museum.color + '18', borderColor: museum.color + '40' }]}>
                  <MaterialCommunityIcons name="layers-outline" size={16} color={museum.color} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneMeta}>{zone.floor} · {zone.items} items</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.88}
          onPress={() => router.push(`/museum/${museum.id}`)}
        >
          <LinearGradient
            colors={[C.accent, C.bronze]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>{t('museum.viewDetail')}</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={C.onAccent} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bgPrimary },
  scrollContent: { paddingBottom: 8 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
  },
  headerLabel: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 2, marginBottom: 3 },
  title:    { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  headerIcon: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 4,
  },

  heroCard: {
    marginHorizontal: 20, marginBottom: 20,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border,
  },
  heroVisual: {
    height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  heroEmoji: { fontSize: 64 },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  tagBadge: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(43,29,14,0.08)',
  },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroBody: { padding: 16 },
  museumName: { fontSize: 18, fontWeight: '800', color: C.textPrimary, lineHeight: 24, marginBottom: 8 },
  description: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },

  infoSection: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: C.bgSurface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accent + '30',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginTop: 3, lineHeight: 20 },
  infoNote:  { fontSize: 12, color: C.danger, marginTop: 3 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 2, marginBottom: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 14 },

  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  highlightDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7, marginRight: 12 },
  highlightText: { flex: 1, fontSize: 14, color: C.textSecondary, lineHeight: 22 },

  zoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bgSurface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  zoneIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  zoneMeta: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  cta: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: C.onAccent },
});
