import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { apiService, getAuthErrorMessage } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';
import { validateEmail } from '../../src/utils/authValidation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const err = validateEmail(email);
    setEmailError(err);
    setFormError(null);
    setSuccessMessage(null);
    if (err) return;

    setLoading(true);
    try {
      const response = await apiService.forgotPassword(email.trim());
      setSuccessMessage(
        response.message ||
          'Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.',
      );
    } catch (error: unknown) {
      setFormError(getAuthErrorMessage(error, 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
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
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Quên mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận để bạn đặt lại mật khẩu.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="email@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(null);
                if (formError) setFormError(null);
                if (successMessage) setSuccessMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
              </Text>
            </TouchableOpacity>

            {successMessage ? (
              <TouchableOpacity
                style={styles.resetLinkBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/reset-password',
                    params: { email: email.trim() },
                  })
                }
              >
                <Text style={styles.resetLinkText}>Tôi đã có mã — Đặt lại mật khẩu</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Nhớ mật khẩu? </Text>
              <Link href="/(auth)/login">
                <Text style={styles.loginLink}>Đăng nhập</Text>
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
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 20 },
  backText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  subtitle: { fontSize: 14, color: C.textMuted, marginTop: 8, marginBottom: 28, lineHeight: 22 },
  form: {
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
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
  formError: { color: C.danger, fontSize: 13, textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  successText: {
    color: C.success,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resetLinkBtn: { marginTop: 16, alignItems: 'center' },
  resetLinkText: { color: C.accent, fontSize: 14, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: C.textSecondary, fontSize: 14 },
  loginLink: { color: C.accent, fontSize: 14, fontWeight: '700' },
});
