import { Link, useRouter } from 'expo-router';
import { C } from '../../src/theme/colors';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/apiService';
import { saveToken } from '../../src/services/tokenStorage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.login(email, password);
      if (response.data && response.data.accessToken) {
        await saveToken(response.data.accessToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Đăng nhập thất bại', response.message || 'Đăng nhập không thành công.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi kết nối', error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo / Branding */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>AR</Text>
          </View>
          <Text style={styles.appName}>MuseumAR</Text>
          <Text style={styles.tagline}>Trải nghiệm lịch sử theo cách mới</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Đăng nhập</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotBtn}>
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
            style={styles.guestBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.guestBtnText}>Tiếp tục với tư cách khách</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <Link href="/(auth)/register">
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  container: { flex: 1, paddingHorizontal: 24 },
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
  logoText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
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
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.textPrimary,
    marginBottom: 12,
    backgroundColor: C.bgElevated,
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  loginBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.divider },
  dividerText: { marginHorizontal: 12, color: C.textMuted, fontSize: 13 },
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
