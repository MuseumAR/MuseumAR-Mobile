import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../src/i18n/LanguageContext';
import type { AppLanguage } from '../src/services/languagePrefs';
import { C } from '../src/theme/colors';

const OPTIONS: { code: AppLanguage; flag: string }[] = [
  { code: 'vi', flag: '🇻🇳' },
  { code: 'en', flag: '🇬🇧' },
];

export default function SettingsScreen() {
  const { lang, setLanguage, t } = useLanguage();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings.title') }} />

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <Text style={styles.hint}>{t('settings.languageHint')}</Text>

        <View style={styles.card}>
          {OPTIONS.map((opt, index) => {
            const active = lang === opt.code;
            const label =
              opt.code === 'vi'
                ? t('settings.vietnamese')
                : t('settings.english');
            return (
              <TouchableOpacity
                key={opt.code}
                style={[
                  styles.row,
                  index < OPTIONS.length - 1 && styles.rowBorder,
                  active && styles.rowActive,
                ]}
                onPress={() => void setLanguage(opt.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.flag}>{opt.flag}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.langName, active && { color: C.accent }]}>
                    {label}
                  </Text>
                  <Text style={styles.langCode}>{opt.code.toUpperCase()}</Text>
                </View>
                {active ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={22}
                    color={C.accent}
                  />
                ) : (
                  <View style={styles.radio} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  content: { padding: 20, gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hint: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  card: {
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowActive: {
    backgroundColor: C.accent + '10',
  },
  flag: { fontSize: 22 },
  rowText: { flex: 1 },
  langName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
  },
  langCode: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.border,
  },
});
