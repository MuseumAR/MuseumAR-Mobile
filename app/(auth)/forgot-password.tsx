import { Link, useRouter } from 'expo-router';
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
import { getSession } from '../../src/services/sessionStorage';
import { getToken } from '../../src/services/tokenStorage';
import { C } from '../../src/theme/colors';
import { validatePassword } from '../../src/utils/authValidation';

/**
 * Authenticated change-password via OTP (POST /Auth/send-password-otp + change-password).
 * Replaces the old unauthenticated forgot-password GUID flow on this route.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [hasPassword, setHasPassword] = useState(true);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) {
          setAuthed(false);
          setReady(true);
        }
        return;
      }
      const session = await getSession();
      let accountHasPassword = true;
      let maskedEmail = session?.email ?? '';
      try {
        const res = await apiService.hasPassword();
        if (res.data) {
          if (typeof res.data.hasPassword === 'boolean') {
            accountHasPassword = res.data.hasPassword;
          }
          if (res.data.email) maskedEmail = res.data.email;
        }
      } catch {
        // Optional probe — assume password account if probe fails.
      }
      if (!cancelled) {
        setAuthed(true);
        setEmail(maskedEmail);
        setHasPassword(accountHasPassword);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearMessages = () => {
    setFieldError(null);
    setFormError(null);
  };

  const handleSendOtp = useCallback(async () => {
    clearMessages();
    setSendingOtp(true);
    try {
      const res = await apiService.sendPasswordOtp();
      const em = (res.data?.email ?? email).trim();
      if (em) setEmail(em);
      setOtpSent(true);
      setInfo(
        res.message ||
          t('auth.changePasswordOtpSent').replace('{email}', em || email || '…'),
      );
    } catch (err: unknown) {
      setFormError(
        getAuthErrorMessage(err, t('auth.changePasswordOtpFail')),
      );
    } finally {
      setSendingOtp(false);
    }
  }, [email, t]);

  const handleSubmit = useCallback(async () => {
    clearMessages();
    const otpTrim = otp.trim();
    if (!/^\d{6}$/.test(otpTrim)) {
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
    if (hasPassword && !oldPassword.trim()) {
      setFieldError(t('auth.changePasswordOldRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.changePassword({
        otp: otpTrim,
        newPassword,
        oldPassword: hasPassword ? oldPassword : undefined,
      });
      setInfo(res.message || t('auth.changePasswordSuccess'));
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/profile');
      }, 900);
    } catch (err: unknown) {
      setFormError(
        getAuthErrorMessage(err, t('auth.changePasswordFail')),
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    confirmPassword,
    hasPassword,
    newPassword,
    oldPassword,
    otp,
    router,
    t,
  ]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!authed) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('auth.changePasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.changePasswordNeedLogin')}</Text>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { next: '/(auth)/forgot-password' },
              })
            }
          >
            <Text style={styles.submitBtnText}>{t('common.login')}</Text>
          </TouchableOpacity>
        </ScrollView>
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
            {hasPassword
              ? t('auth.changePasswordSubtitle')
              : t('auth.changePasswordSetSubtitle')}
          </Text>

          <View style={styles.form}>
            {email ? (
              <Text style={styles.emailHint}>
                {t('auth.changePasswordEmail').replace('{email}', email)}
              </Text>
            ) : null}

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
            />

            {hasPassword ? (
              <>
                <Text style={styles.label}>{t('auth.changePasswordOld')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  value={oldPassword}
                  onChangeText={(text) => {
                    setOldPassword(text);
                    clearMessages();
                  }}
                  secureTextEntry
                />
              </>
            ) : null}

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
                  {hasPassword
                    ? t('auth.changePasswordSubmit')
                    : t('auth.changePasswordSetSubmit')}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Link href="/(tabs)/profile">
                <Text style={styles.loginLink}>{t('profile.title')}</Text>
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
    fontSize: 14,
    color: C.textMuted,
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
  emailHint: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 14,
    lineHeight: 20,
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
