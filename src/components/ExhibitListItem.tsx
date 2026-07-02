import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getExhibitById } from '../data/exhibits';
import { C } from '../theme/colors';

type Props = {
  exhibitId: number;
  subtitle?: string;
  onPress: () => void;
};

export function ExhibitListItem({ exhibitId, subtitle, onPress }: Props) {
  const exhibit = getExhibitById(String(exhibitId));
  const title = exhibit?.title ?? `Hiện vật #${exhibitId}`;
  const meta = exhibit?.category ?? exhibit?.era;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.thumb, { backgroundColor: (exhibit?.color ?? C.accent) + '22' }]}>
        <Text style={styles.emoji}>{exhibit?.emoji ?? '🏺'}</Text>
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
  },
  emoji: { fontSize: 26 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: C.textPrimary, lineHeight: 20 },
  meta: { fontSize: 11, color: C.accent, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 4 },
});
