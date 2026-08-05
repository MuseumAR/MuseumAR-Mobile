import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { C } from '../../src/theme/colors';
import { useCallback, useState } from 'react';
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
import { useGoogleLogin } from '../../src/hooks/useGoogleLogin';
import { apiService, getLoginErrorMessage } from '../../src/services/apiService';
import { persistAuthLogin } from '../../src/services/persistAuthLogin';
import { validateLoginForm } from '../../src/utils/authValidation';

export default function LoginScreen() {
  const router = useRouter();
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
        setFormError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra và thử lại.');
      }
    } catch (error: unknown) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
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
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>AR</Text>
            </View>
            <Text style={styles.appName}>MuseumAR</Text>
            <Text style={styles.tagline}>Trải nghiệm lịch sử theo cách mới</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Đăng nhập</Text>

            <Text style={styles.label}>Email</Text>
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

            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder="Nhập mật khẩu"
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

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
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
                  <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
                </>
              )}
            </TouchableOpacity>
            {!googleConfigured ? (
              <Text style={styles.googleHint}>
                Cần cấu hình Google OAuth client id trong app.json (expo.extra.googleClientIds).
              </Text>
            ) : null}
            {googleError ? <Text style={styles.fieldError}>{googleError}</Text> : null}

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.guestBtnText}>Tiếp tục với tư cách khách</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <Link href="/(auth)/register">
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
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
  brand: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: C.onAccent, fontSize: 24, fontWeight: '900' },
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
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 20 },
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
