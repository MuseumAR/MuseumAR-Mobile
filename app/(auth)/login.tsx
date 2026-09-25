import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useGoogleLogin } from '../../src/hooks/useGoogleLogin';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { apiService, getLoginErrorMessage } from '../../src/services/apiService';
import type { AppLanguage } from '../../src/services/languagePrefs';
import { persistAuthLogin } from '../../src/services/persistAuthLogin';
import { C } from '../../src/theme/colors';
import { validateLoginForm } from '../../src/utils/authValidation';

export default function LoginScreen() {
  const router = useRouter();
  const { t, lang, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const onGoogleSuccess = useCallback(() => router.replace('/(tabs)'), [router]);
  const {
    signIn: googleSignIn,
    loading: googleLoading,
    error: googleError,
    configured: googleConfigured,
  } = useGoogleLogin(onGoogleSuccess);

  const handleLogin = async () => {
    const validation = validateLoginForm(email, password);
    setEmailError(validation.emailError);
    setPasswordError(validation.passwordError);
    setFormError(null);

    if (validation.emailError || validation.passwordError) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(email.trim(), password);
      if (response.data?.accessToken) {
        await persistAuthLogin(response.data);
        router.replace('/(tabs)');
      } else {
        setFormError(t('auth.loginFailed'));
      }
    } catch (error: unknown) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const switchLang = (code: AppLanguage) => {
    if (code !== lang) void setLanguage(code);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langChip, lang === 'vi' && styles.langChipActive]}
              onPress={() => switchLang('vi')}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === 'vi' }}
            >
              <Text style={[styles.langChipText, lang === 'vi' && styles.langChipTextActive]}>
                {t('auth.langVi')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, lang === 'en' && styles.langChipActive]}
              onPress={() => switchLang('en')}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === 'en' }}
            >
              <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>
                {t('auth.langEn')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.brand}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="MuseumAR"
            />
            <Text style={styles.appName}>MuseumAR</Text>
            <Text style={styles.tagline}>{t('auth.tagline')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{t('auth.login')}</Text>

            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="email@example.com"
              placeholderTextColor={C.textPlaceholder}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(null);
                if (formError) setFormError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <Text style={styles.label}>{t('auth.password')}</Text>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={C.textPlaceholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(null);
                if (formError) setFormError(null);
              }}
              secureTextEntry
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/verify-email',
                    params: {
                      email: email.trim(),
                      next: '/(auth)/login',
                    },
                  })
                }
              >
                <Text style={styles.forgotText}>{t('auth.verifyLink')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? t('auth.loggingIn') : t('auth.login')}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, (googleLoading || !googleConfigured) && styles.googleBtnDisabled]}
              onPress={googleSignIn}
              disabled={googleLoading || !googleConfigured}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={C.textPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                  <Text style={styles.googleBtnText}>{t('auth.googleLogin')}</Text>
                </>
              )}
            </TouchableOpacity>
            {!googleConfigured ? (
              <Text style={styles.googleHint}>{t('auth.googleNotConfigured')}</Text>
            ) : null}
            {googleError ? <Text style={styles.fieldError}>{googleError}</Text> : null}

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.guestBtnText}>{t('auth.guestContinue')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
            <Link href="/(auth)/register">
              <Text style={styles.registerLink}>{t('auth.registerNow')}</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
  },
  langChip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgSurface,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
  },
  langChipTextActive: {
    color: C.onAccent,
  },
  brand: { alignItems: 'center', paddingTop: 24, paddingBottom: 32 },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  appName: { fontSize: 26, fontWeight: '800', color: C.textPrimary },
  tagline: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  form: {
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
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
  fieldError: { color: C.danger, fontSize: 12, marginBottom: 10 },
  formError: {
    color: C.danger,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  forgotText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  loginBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: C.onAccent, fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.divider },
  dividerText: { marginHorizontal: 12, color: C.textMuted, fontSize: 13 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    minHeight: 50,
    backgroundColor: C.bgElevated,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleBtnText: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  googleHint: { color: C.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 12, lineHeight: 16 },
  guestBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: { color: C.textSecondary, fontSize: 14 },
  registerLink: { color: C.accent, fontSize: 14, fontWeight: '700' },
});
