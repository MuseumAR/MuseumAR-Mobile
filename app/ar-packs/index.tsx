import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ARPackCard } from '../../src/components/ARPackCard';
import { AR_PACKS } from '../../src/data/arPacks';
import { MUSEUMS } from '../../src/data/museums';
import { useARPacks } from '../../src/hooks/useARPacks';
import { C } from '../../src/theme/colors';

const MUSEUM_EMOJI: Record<string, string> = {
  m1: '🏛', m2: '⚔️', m3: '🎭', m4: '🗿', m5: '🎨',
};

// Total storage capacity for progress bar (GB)
const TOTAL_STORAGE_MB = 2048;

export default function ARPacksScreen() {
  const router = useRouter();
  const { downloadPack, deletePack, getState } = useARPacks();

  const downloadedPacks   = AR_PACKS.filter((p) => getState(p.id).status === 'downloaded');
  const downloadedCount   = downloadedPacks.length;
  const usedStorageMB     = downloadedPacks.reduce((s, p) => s + p.sizeMB, 0);
  const storagePercent    = Math.min((usedStorageMB / TOTAL_STORAGE_MB) * 100, 100);
  const totalArtifacts    = downloadedPacks.reduce((s, p) => s + p.artifactCount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>OFFLINE CONTENT</Text>
            <Text style={styles.title}>AR Packs</Text>
            <Text style={styles.subtitle}>Download packs to explore artifacts in 3D</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: C.accentDark, borderColor: C.accent + '40' }]}>
            <MaterialCommunityIcons name="package-variant-closed" size={22} color={C.accent} />
          </View>
        </View>

        {/* ── Storage card ─────────────────────────────────────────────── */}
        <View style={styles.storageCard}>
          <LinearGradient
            colors={[C.accent + '12', C.bronze + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Top accent line */}
          <LinearGradient
            colors={[C.accent, C.bronze]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.storageAccentLine}
          />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: C.accentDark, borderColor: C.accent + '40' }]}>
                <MaterialCommunityIcons name="package-check" size={18} color={C.accent} />
              </View>
              <Text style={styles.statValue}>{downloadedCount}</Text>
              <Text style={styles.statLabel}>Downloaded</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: C.accentDark, borderColor: C.accent + '40' }]}>
                <MaterialCommunityIcons name="harddisk" size={18} color={C.accent} />
              </View>
              <Text style={styles.statValue}>{usedStorageMB} MB</Text>
              <Text style={styles.statLabel}>Storage used</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: C.accentDark, borderColor: C.accent + '40' }]}>
                <MaterialCommunityIcons name="cube-scan" size={18} color={C.accent} />
              </View>
              <Text style={styles.statValue}>{totalArtifacts}</Text>
              <Text style={styles.statLabel}>Artifacts ready</Text>
            </View>
          </View>

          {/* Storage bar */}
          <View style={styles.storageBarWrap}>
            <View style={styles.storageBarRow}>
              <Text style={styles.storageBarLabel}>Local storage</Text>
              <Text style={styles.storageBarValue}>{usedStorageMB} / {TOTAL_STORAGE_MB} MB</Text>
            </View>
            <View style={styles.storageTrack}>
              <LinearGradient
                colors={[C.accent, C.bronze]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.storageFill, { width: `${storagePercent}%` as any }]}
              />
            </View>
          </View>
        </View>

        {/* ── Packs grouped by museum ───────────────────────────────────── */}
        {MUSEUMS.map((museum) => {
          const packs = AR_PACKS.filter((p) => p.museumId === museum.id);
          if (packs.length === 0) return null;

          const museumDownloaded = packs.filter((p) => getState(p.id).status === 'downloaded').length;

          return (
            <View key={museum.id} style={styles.museumSection}>
              {/* Museum header */}
              <TouchableOpacity
                style={styles.museumHeader}
                activeOpacity={0.8}
                onPress={() => router.push(`/museum/${museum.id}`)}
              >
                <View style={[styles.museumEmojiBg, { backgroundColor: museum.color + '18', borderColor: museum.color + '40' }]}>
                  <Text style={styles.museumEmoji}>{MUSEUM_EMOJI[museum.id] ?? '🏛'}</Text>
                </View>

                <View style={styles.museumInfo}>
                  <Text style={styles.museumName} numberOfLines={1}>{museum.name}</Text>
                  <View style={styles.museumMeta}>
                    <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.textSecondary} />
                    <Text style={styles.museumCity}>{museum.city}</Text>
                    <Text style={styles.museumDot}>·</Text>
                    <Text style={[styles.museumPackCount, { color: museum.color }]}>
                      {museumDownloaded}/{packs.length} packs
                    </Text>
                  </View>
                </View>

                <View style={[styles.viewBtn, { borderColor: museum.color + '50' }]}>
                  <Text style={[styles.viewBtnText, { color: museum.color }]}>Visit</Text>
                  <MaterialCommunityIcons name="arrow-right" size={12} color={museum.color} />
                </View>
              </TouchableOpacity>

              {/* Pack cards */}
              <View style={styles.packList}>
                {packs.map((pack) => (
                  <ARPackCard
                    key={pack.id}
                    pack={pack}
                    state={getState(pack.id)}
                    onDownload={() => downloadPack(pack.id)}
                    onDelete={() => deletePack(pack.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* ── Bottom tip ───────────────────────────────────────────────── */}
        <View style={styles.tip}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.textMuted} />
          <Text style={styles.tipText}>
            Downloaded packs work offline. Scan artifacts at the museum to launch AR view.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bgPrimary },
  scrollContent: { paddingBottom: 8 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20,
  },
  headerLabel: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 2, marginBottom: 3 },
  title:    { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  headerIcon: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 4,
  },

  // Storage card
  storageCard: {
    marginHorizontal: 20, marginBottom: 28,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.accent + '30',
    backgroundColor: C.bgSurface,
  },
  storageAccentLine: { height: 2 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  statItem:    { flex: 1, alignItems: 'center', gap: 6 },
  statIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  statValue:   { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  statLabel:   { fontSize: 10, color: C.textSecondary, textAlign: 'center' },
  statDivider: { width: 1, height: 52, backgroundColor: C.border },

  storageBarWrap: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  storageBarRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  storageBarLabel:{ fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  storageBarValue:{ fontSize: 11, color: C.accent, fontWeight: '700' },
  storageTrack: {
    height: 6, backgroundColor: C.bgElevated,
    borderRadius: 3, overflow: 'hidden',
  },
  storageFill:  { height: 6, borderRadius: 3 },

  // Museum section
  museumSection: { marginBottom: 8 },
  museumHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    gap: 12,
  },
  museumEmojiBg: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  museumEmoji: { fontSize: 22 },
  museumInfo:  { flex: 1 },
  museumName:  { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  museumMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  museumCity:  { fontSize: 11, color: C.textSecondary },
  museumDot:   { fontSize: 11, color: C.textMuted },
  museumPackCount: { fontSize: 11, fontWeight: '700' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: 'transparent',
  },
  viewBtnText: { fontSize: 11, fontWeight: '700' },

  packList: { paddingHorizontal: 20, gap: 0 },

  // Tip
  tip: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginHorizontal: 20, marginTop: 8,
    padding: 14, borderRadius: 12,
    backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border,
  },
  tipText: { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },
});
