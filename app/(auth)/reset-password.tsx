import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { C } from '../../src/theme/colors';
import { validatePassword } from '../../src/utils/authValidation';

function paramOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

/**
 * Step 2 — same OTP + new password UI as Settings change-password,
 * for the email entered on forgot-password (public reset).
 * Send/resend: POST /Auth/forgot-password
 * Submit: POST /Auth/reset-password { token: otp, newPassword }
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ email?: string | string[]; hint?: string | string[] }>();
  const email = paramOne(params.email).trim();
  const initialHint = paramOne(params.hint).trim();

  const [otpSent, setOtpSent] = useState(Boolean(email));
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    initialHint ||
      (email
        ? t('auth.changePasswordOtpSent').replace('{email}', email)
        : null),
  );
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/forgot-password');
    }
  }, [email, router]);

  const clearMessages = () => {
    setFieldError(null);
    setFormError(null);
  };

  const handleSendOtp = useCallback(async () => {
    if (!email) return;
    clearMessages();
    setSendingOtp(true);
    try {
      const res = await apiService.forgotPassword(email);
      setOtpSent(true);
      setInfo(
        res.message ||
          t('auth.changePasswordOtpSent').replace('{email}', email),
      );
    } catch (err: unknown) {
      setFormError(getAuthErrorMessage(err, t('auth.changePasswordOtpFail')));
    } finally {
      setSendingOtp(false);
    }
  }, [email, t]);

  const handleSubmit = useCallback(async () => {
    clearMessages();
    const otpTrim = otp.trim();
    if (!otpTrim || !/^\d{6}$/.test(otpTrim)) {
      setFieldError(t('auth.changePasswordOtpInvalid'));
      return;
    }
    const pwdErr = validatePassword(newPassword, 6);
    if (pwdErr) {
      setFieldError(pwdErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError(t('auth.changePasswordConfirmMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.resetPassword(otpTrim, newPassword, email);
      setInfo(res.message || t('auth.resetSuccess'));
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 900);
    } catch (err: unknown) {
      setFormError(getAuthErrorMessage(err, t('auth.changePasswordFail')));
    } finally {
      setSubmitting(false);
    }
  }, [confirmPassword, email, newPassword, otp, router, t]);

  if (!email) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{t('auth.changePasswordTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.changePasswordFor').replace('{email}', email)}
          </Text>

          <View style={styles.form}>
            <TouchableOpacity
              style={[styles.otpBtn, sendingOtp && styles.submitBtnDisabled]}
              onPress={() => void handleSendOtp()}
              disabled={sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator color={C.onAccent} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {otpSent
                    ? t('auth.changePasswordResendOtp')
                    : t('auth.changePasswordSendOtp')}
                </Text>
              )}
            </TouchableOpacity>

            {info ? <Text style={styles.successText}>{info}</Text> : null}

            <Text style={styles.label}>{t('auth.changePasswordOtp')}</Text>
            <TextInput
              style={[styles.input, fieldError && styles.inputError]}
              placeholder="123456"
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, '').slice(0, 6));
                clearMessages();
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{t('auth.changePasswordNew')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                clearMessages();
              }}
              secureTextEntry
            />

            <Text style={styles.label}>{t('auth.changePasswordConfirm')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearMessages();
              }}
              secureTextEntry
            />

            {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitting || !otpSent) && styles.submitBtnDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting || !otpSent}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {t('auth.changePasswordSubmit')}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Link href="/(auth)/login">
                <Text style={styles.loginLink}>{t('auth.backToLogin')}</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 20 },
  backText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
  },
  form: {
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.textPrimary,
    marginBottom: 4,
    backgroundColor: C.bgElevated,
  },
  inputError: { borderColor: C.danger },
  fieldError: { color: C.danger, fontSize: 12, marginBottom: 10, marginTop: 4 },
  formError: {
    color: C.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  successText: {
    color: C.success,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  otpBtn: {
    backgroundColor: C.bronze,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginLink: { color: C.accent, fontSize: 14, fontWeight: '700' },
});
