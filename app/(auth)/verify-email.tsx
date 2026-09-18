import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { apiService, getAuthErrorMessage } from '../../src/services/apiService';
import { getSession } from '../../src/services/sessionStorage';
import { C } from '../../src/theme/colors';
import { validateEmail } from '../../src/utils/authValidation';

function paramOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    email?: string | string[];
    next?: string | string[];
  }>();

  const emailFromUrl = paramOne(params.email).trim();
  const nextPath = paramOne(params.next).trim();

  const [email, setEmail] = useState(emailFromUrl);
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    emailFromUrl ? t('auth.verifyEmailHint') : null,
  );
  const [done, setDone] = useState(false);
  const autoSent = useRef(false);

  useEffect(() => {
    if (emailFromUrl) return;
    void (async () => {
      const session = await getSession();
      if (session?.email) setEmail(session.email);
    })();
  }, [emailFromUrl]);

  const handleResend = useCallback(async () => {
    setError(null);
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setResending(true);
    try {
      await apiService.resendVerification(email.trim());
      setInfo(t('auth.verifyResent'));
    } catch (err: unknown) {
      setError(
        getAuthErrorMessage(err, t('auth.verifyResendFail')),
      );
    } finally {
      setResending(false);
    }
  }, [email, t]);

  useEffect(() => {
    if (!emailFromUrl || !nextPath || autoSent.current) return;
    autoSent.current = true;
    void handleResend();
  }, [emailFromUrl, nextPath, handleResend]);

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const code = token.trim();
    if (!/^\d{6}$/.test(code)) {
      setError(t('auth.verifyTokenInvalid'));
      return;
    }

    setSubmitting(true);
    try {
      await apiService.verifyEmail(email.trim(), code);
      setDone(true);
      setTimeout(() => {
        if (nextPath === 'ticket' || nextPath === '/(tabs)/ticket') {
          router.replace('/(tabs)/ticket');
        } else if (nextPath.startsWith('/')) {
          router.replace(nextPath as '/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 1200);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, t('auth.verifyFail')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="email-check-outline" size={36} color={C.accent} />
          </View>
          <Text style={styles.title}>{t('auth.verifyEmailTitle')}</Text>
          <Text style={styles.subtitle}>
            {done ? t('auth.verifyEmailDone') : t('auth.verifyEmailSubtitle')}
          </Text>

          {done ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{t('auth.verifyEmailDoneHint')}</Text>
            </View>
          ) : (
            <View style={styles.form}>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {info ? <Text style={styles.info}>{info}</Text> : null}

              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="email@example.com"
                placeholderTextColor={C.textPlaceholder}
              />

              <Text style={styles.label}>{t('auth.verifyCode')}</Text>
              <TextInput
                style={styles.input}
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={C.textPlaceholder}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                onPress={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={C.onAccent} />
                ) : (
                  <Text style={styles.primaryText}>{t('auth.verifySubmit')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleResend()}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator color={C.accent} />
                ) : (
                  <Text style={styles.secondaryText}>{t('auth.verifyResend')}</Text>
                )}
              </TouchableOpacity>

              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.linkBtn}>
                  <Text style={styles.linkText}>{t('auth.backToLogin')}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.textPrimary },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: C.textSecondary,
    marginBottom: 20,
  },
  form: { gap: 8 },
  label: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.textPrimary,
    backgroundColor: C.bgSurface,
  },
  error: {
    color: C.danger,
    fontSize: 13,
    backgroundColor: C.danger + '14',
    padding: 10,
    borderRadius: 10,
  },
  info: {
    color: C.accent,
    fontSize: 13,
    backgroundColor: C.accent + '14',
    padding: 10,
    borderRadius: 10,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: C.onAccent, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgSurface,
  },
  secondaryText: { color: C.accent, fontWeight: '600', fontSize: 14 },
  linkBtn: { marginTop: 18, alignItems: 'center' },
  linkText: { color: C.textMuted, fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  successBox: {
    backgroundColor: C.success + '18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.success + '44',
  },
  successText: { color: C.success, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
