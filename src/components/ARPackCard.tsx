import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ARPack } from '../data/arPacks';
import { PackState } from '../hooks/useARPacks';
import { C } from '../theme/colors';

type Props = {
  pack: ARPack;
  state: PackState;
  onDownload: () => void;
  onDelete: () => void;
};

export function ARPackCard({ pack, state, onDownload, onDelete }: Props) {
  const isDownloaded  = state.status === 'downloaded';
  const isDownloading = state.status === 'downloading';
  const isError = state.status === 'error';

  return (
    <View style={styles.card}>
      {/* Gold top accent line */}
      <View style={[styles.accentLine, { backgroundColor: pack.color }]} />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: pack.color + '20', borderColor: pack.color + '40' }]}>
          <MaterialCommunityIcons name="package-variant" size={22} color={pack.color} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{pack.name}</Text>
          <Text style={styles.meta}>
            {pack.artifactCount} artifacts · {pack.sizeMB} MB
          </Text>
        </View>

        {isDownloaded && (
          <View style={styles.downloadedBadge}>
            <MaterialCommunityIcons name="check-circle" size={13} color={C.success} />
            <Text style={styles.downloadedText}>Downloaded</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={styles.desc}>{pack.description}</Text>

      {/* Artifact chips */}
      <View style={styles.chipRow}>
        {pack.artifacts.slice(0, 3).map((a) => (
          <View key={a} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>{a}</Text>
          </View>
        ))}
        {pack.artifacts.length > 3 && (
          <View style={[styles.chip, styles.chipMore]}>
            <Text style={[styles.chipText, { color: C.accent }]}>+{pack.artifacts.length - 3}</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {isDownloading && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${state.progress}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{state.progress}%</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isDownloaded ? (
          <>
            <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85}>
              <LinearGradient
                colors={[C.accent, C.bronze]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <MaterialCommunityIcons name="augmented-reality" size={16} color={C.onAccent} />
                <Text style={styles.btnPrimaryText}>Open AR</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnDanger} onPress={onDelete} activeOpacity={0.8}>
              <MaterialCommunityIcons name="delete-outline" size={16} color={C.danger} />
              <Text style={styles.btnDangerText}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : isDownloading ? (
          <View style={styles.btnDisabled}>
            <MaterialCommunityIcons name="download" size={16} color={C.textMuted} />
            <Text style={styles.btnDisabledText}>Downloading… {state.progress}%</Text>
          </View>
        ) : isError ? (
          <TouchableOpacity style={styles.btnDownload} onPress={onDownload} activeOpacity={0.85}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={C.accent} />
            <Text style={styles.btnDownloadText}>Retry download</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnDownload} onPress={onDownload} activeOpacity={0.85}>
            <MaterialCommunityIcons name="download" size={16} color={C.accent} />
            <Text style={styles.btnDownloadText}>Download · {pack.sizeMB} MB</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  accentLine: { height: 2, width: '100%' },

  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 16, paddingBottom: 10,
  },
  iconBg: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  info:  { flex: 1 },
  name:  { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  meta:  { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  downloadedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.success + '18', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: C.success + '40',
  },
  downloadedText: { fontSize: 11, fontWeight: '700', color: C.success },

  desc: {
    fontSize: 13, color: C.textSecondary, lineHeight: 20,
    paddingHorizontal: 16, marginBottom: 10,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 14 },
  chip: {
    backgroundColor: C.bgElevated, borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  chipMore: { borderColor: C.accent + '50', backgroundColor: C.accentDark },
  chipText: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 16, marginBottom: 12,
  },
  progressTrack: {
    flex: 1, height: 5, backgroundColor: C.bgElevated,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill:  { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: C.accent, minWidth: 36 },

  actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 0 },

  btnPrimary: { flex: 1, borderRadius: 11, overflow: 'hidden' },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 11,
  },
  btnPrimaryText: { color: C.onAccent, fontWeight: '700', fontSize: 13 },

  btnDanger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 11, backgroundColor: C.dangerMuted,
    borderWidth: 1, borderColor: C.danger + '40',
  },
  btnDangerText: { color: C.danger, fontWeight: '700', fontSize: 13 },

  btnDownload: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 11, borderRadius: 11,
    backgroundColor: C.accentDark, borderWidth: 1, borderColor: C.accent + '50',
  },
  btnDownloadText: { color: C.accent, fontWeight: '700', fontSize: 13 },

  btnDisabled: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 11, borderRadius: 11,
    backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border,
  },
  btnDisabledText: { color: C.textMuted, fontWeight: '600', fontSize: 13 },
});
