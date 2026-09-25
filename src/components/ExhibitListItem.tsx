import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ExhibitRecord } from '../data/exhibits';
import { resolveOfflineUri, thumbLogicalKey } from '../services/offlineMedia';
import { C } from '../theme/colors';

type Props = {
  exhibitId: number;
  /** Prefer API-backed record so title matches Content exhibits. */
  exhibit?: ExhibitRecord | null;
  subtitle?: string;
  onPress: () => void;
};

export function ExhibitListItem({ exhibitId, exhibit, subtitle, onPress }: Props) {
  const title = exhibit?.title ?? `Hiện vật #${exhibitId}`;
  const meta = exhibit?.category || exhibit?.era || undefined;
  const color = exhibit?.color ?? C.accent;
  const thumbUri =
    resolveOfflineUri(exhibit?.thumbnailUrl, thumbLogicalKey(exhibitId)) ??
    exhibit?.thumbnailUrl;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.thumb, { backgroundColor: color + '22' }]}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{exhibit?.emoji ?? '🏺'}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={C.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 26 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: C.textPrimary, lineHeight: 20 },
  meta: { fontSize: 11, color: C.accent, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 4 },
});
