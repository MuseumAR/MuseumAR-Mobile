import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { validateResetPasswordForm } from '../../src/utils/authValidation';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const validation = validateResetPasswordForm(token, newPassword, confirmPassword);
    setTokenError(validation.tokenError);
    setPasswordError(validation.passwordError);
    setConfirmError(validation.confirmError);
    setFormError(null);

    if (validation.tokenError || validation.passwordError || validation.confirmError) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.resetPassword(token.trim(), newPassword);
      Alert.alert(
        'Thành công',
        response.message || 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập.',
        [{ text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (error: unknown) {
      setFormError(getAuthErrorMessage(error, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'));
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

          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            {email
              ? `Nhập mã xác nhận đã gửi tới ${email} và mật khẩu mới.`
              : 'Nhập mã xác nhận từ email và mật khẩu mới của bạn.'}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Mã xác nhận</Text>
            <TextInput
              style={[styles.input, tokenError && styles.inputError]}
              placeholder="Dán mã từ email"
              placeholderTextColor="#9CA3AF"
              value={token}
              onChangeText={(text) => {
                setToken(text);
                if (tokenError) setTokenError(null);
                if (formError) setFormError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {tokenError ? <Text style={styles.fieldError}>{tokenError}</Text> : null}

            <Text style={styles.label}>Mật khẩu mới</Text>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder="Tối thiểu 8 ký tự"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (passwordError) setPasswordError(null);
                if (formError) setFormError(null);
              }}
              secureTextEntry
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
            <TextInput
              style={[styles.input, confirmError && styles.inputError]}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmError) setConfirmError(null);
                if (formError) setFormError(null);
              }}
              secureTextEntry
            />
            {confirmError ? <Text style={styles.fieldError}>{confirmError}</Text> : null}

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Chưa có mã? </Text>
              <Link href="/(auth)/forgot-password">
                <Text style={styles.loginLink}>Gửi lại email</Text>
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
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: C.textSecondary, fontSize: 14 },
  loginLink: { color: C.accent, fontSize: 14, fontWeight: '700' },
});
