import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ARPack } from '../data/arPacks';
import { PackState } from '../hooks/useARPacks';

type Props = {
  pack: ARPack;
  state: PackState;
  onDownload: () => void;
  onDelete: () => void;
};

export function ARPackCard({ pack, state, onDownload, onDelete }: Props) {
  const isDownloaded = state.status === 'downloaded';
  const isDownloading = state.status === 'downloading';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: pack.color + '20' }]}>
          <MaterialCommunityIcons name="package-variant" size={22} color={pack.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{pack.name}</Text>
          <Text style={styles.meta}>
            {pack.artifactCount} hiện vật · {pack.sizeMB} MB
          </Text>
        </View>
        {isDownloaded && (
          <View style={styles.downloadedBadge}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
            <Text style={styles.downloadedText}>Đã tải</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={styles.desc}>{pack.description}</Text>

      {/* Artifact preview */}
      <View style={styles.artifactList}>
        {pack.artifacts.slice(0, 3).map((a) => (
          <View key={a} style={styles.artifactChip}>
            <Text style={styles.artifactText} numberOfLines={1}>{a}</Text>
          </View>
        ))}
        {pack.artifacts.length > 3 && (
          <View style={styles.artifactChip}>
            <Text style={styles.artifactText}>+{pack.artifacts.length - 3}</Text>
          </View>
        )}
      </View>

      {/* Progress bar when downloading */}
      {isDownloading && (
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${state.progress}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{state.progress}%</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {isDownloaded ? (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
              <MaterialCommunityIcons name="augmented-reality" size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Mở AR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onDelete}>
              <MaterialCommunityIcons name="delete-outline" size={16} color="#EF4444" />
              <Text style={styles.btnDangerText}>Xoá</Text>
            </TouchableOpacity>
          </>
        ) : isDownloading ? (
          <TouchableOpacity style={[styles.btn, styles.btnDisabled]} disabled>
            <MaterialCommunityIcons name="download" size={16} color="#9CA3AF" />
            <Text style={styles.btnDisabledText}>Đang tải... {state.progress}%</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnDownload]} onPress={onDownload}>
            <MaterialCommunityIcons name="download" size={16} color="#1A6FA8" />
            <Text style={styles.btnDownloadText}>Tải xuống · {pack.sizeMB} MB</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  downloadedText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  desc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 10 },
  artifactList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  artifactChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  artifactText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  progressWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#1A6FA8', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '700', color: '#1A6FA8', minWidth: 36 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimary: { backgroundColor: '#1A6FA8' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  btnDanger: { backgroundColor: '#FEE2E2', flex: 0, paddingHorizontal: 16 },
  btnDangerText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  btnDownload: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  btnDownloadText: { color: '#1A6FA8', fontWeight: '700', fontSize: 13 },
  btnDisabled: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  btnDisabledText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
});
