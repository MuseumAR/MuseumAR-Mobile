import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ARPack } from '../data/arPacks';
import { PackState } from '../hooks/useARPacks';
import { useLanguage } from '../i18n/LanguageContext';
import { C } from '../theme/colors';

type Props = {
  pack: ARPack;
  state: PackState;
  onDownload: () => void;
  onDelete: () => void;
};

export function ARPackCard({ pack, state, onDownload, onDelete }: Props) {
  const { t } = useLanguage();
  const isDownloaded = state.status === 'downloaded';
  const isDownloading = state.status === 'downloading';
  const isError = state.status === 'error';
  const needsUpdate = isDownloaded && Boolean(state.updateAvailable);

  return (
    <View style={styles.card}>
      <View style={[styles.accentLine, { backgroundColor: pack.color }]} />

      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: pack.color + '20', borderColor: pack.color + '40' }]}>
          <MaterialCommunityIcons name="package-variant" size={22} color={pack.color} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{pack.name}</Text>
          <Text style={styles.meta}>
            {pack.exhibitionId != null
              ? t('packs.scopeExhibition')
              : t('packs.scopeMuseum')}
            {' · '}
            {pack.artifactCount} · {pack.sizeMB} MB
            {pack.versionId != null ? ` · v${pack.versionId}` : ''}
          </Text>
          {pack.exhibitionTitle ? (
            <Text style={styles.exhibitionTitle} numberOfLines={1}>
              {pack.exhibitionTitle}
            </Text>
          ) : null}
        </View>

        {needsUpdate ? (
          <View style={styles.updateBadge}>
            <MaterialCommunityIcons name="update" size={13} color={C.warning} />
            <Text style={styles.updateText}>{t('packs.updateAvailable')}</Text>
          </View>
        ) : isDownloaded ? (
          <View style={styles.downloadedBadge}>
            <MaterialCommunityIcons name="check-circle" size={13} color={C.success} />
            <Text style={styles.downloadedText}>{t('packs.downloadedBadge')}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.desc}>{pack.description}</Text>

      <View style={styles.chipRow}>
        {pack.artifacts.slice(0, 3).map((a) => (
          <View key={a} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {a}
            </Text>
          </View>
        ))}
        {pack.artifacts.length > 3 && (
          <View style={[styles.chip, styles.chipMore]}>
            <Text style={[styles.chipText, { color: C.accent }]}>
              +{pack.artifacts.length - 3}
            </Text>
          </View>
        )}
      </View>

      {isDownloading && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${state.progress}%` as `${number}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{state.progress}%</Text>
        </View>
      )}

      <View style={styles.actions}>
        {needsUpdate ? (
          <>
            <TouchableOpacity style={styles.btnDownload} onPress={onDownload} activeOpacity={0.85}>
              <MaterialCommunityIcons name="update" size={16} color={C.accent} />
              <Text style={styles.btnDownloadText}>
                {t('packs.updateAction')} · {pack.sizeMB} MB
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={onDelete} activeOpacity={0.8}>
              <MaterialCommunityIcons name="delete-outline" size={16} color={C.danger} />
              <Text style={styles.btnDangerText}>{t('packs.delete')}</Text>
            </TouchableOpacity>
          </>
        ) : isDownloaded ? (
          <>
            <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85}>
              <LinearGradient
                colors={[C.accent, C.bronze]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <MaterialCommunityIcons name="augmented-reality" size={16} color={C.onAccent} />
                <Text style={styles.btnPrimaryText}>{t('packs.openAr')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnDanger} onPress={onDelete} activeOpacity={0.8}>
              <MaterialCommunityIcons name="delete-outline" size={16} color={C.danger} />
              <Text style={styles.btnDangerText}>{t('packs.delete')}</Text>
            </TouchableOpacity>
          </>
        ) : isDownloading ? (
          <View style={styles.btnDisabled}>
            <MaterialCommunityIcons name="download" size={16} color={C.textMuted} />
            <Text style={styles.btnDisabledText}>
              {t('packs.downloading')} {state.progress}%
            </Text>
          </View>
        ) : isError ? (
          <TouchableOpacity style={styles.btnDownload} onPress={onDownload} activeOpacity={0.85}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={C.accent} />
            <Text style={styles.btnDownloadText}>{t('packs.retryDownload')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnDownload} onPress={onDownload} activeOpacity={0.85}>
            <MaterialCommunityIcons name="download" size={16} color={C.accent} />
            <Text style={styles.btnDownloadText}>
              {t('packs.downloadAction')} · {pack.sizeMB} MB
            </Text>
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
  accentLine: { height: 3 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  exhibitionTitle: {
    fontSize: 11,
    color: C.bronze,
    fontWeight: '600',
    marginTop: 2,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.success + '18',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  downloadedText: { fontSize: 11, fontWeight: '700', color: C.success },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.warning + '18',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  updateText: { fontSize: 11, fontWeight: '700', color: C.warning },
  desc: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  chip: {
    backgroundColor: C.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
    maxWidth: 120,
  },
  chipMore: { backgroundColor: C.accent + '14' },
  chipText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.bgElevated,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: C.accent, borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: C.accent, minWidth: 36 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingTop: 12,
  },
  btnPrimary: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  btnPrimaryText: { color: C.onAccent, fontSize: 13, fontWeight: '700' },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger + '44',
    backgroundColor: C.danger + '10',
  },
  btnDangerText: { color: C.danger, fontSize: 13, fontWeight: '700' },
  btnDownload: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
  },
  btnDownloadText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  btnDisabled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnDisabledText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
});
