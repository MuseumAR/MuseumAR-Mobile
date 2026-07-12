import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { apiService, getAuthErrorMessage } from '../services/apiService';
import { saveTokens } from '../services/tokenStorage';

// Đảm bảo phiên đăng nhập trên web browser được đóng đúng cách
WebBrowser.maybeCompleteAuthSession();

type GoogleClientIds = {
  expo?: string;
  web?: string;
  ios?: string;
  android?: string;
};

function readClientIds(): GoogleClientIds {
  const extra = (Constants.expoConfig?.extra ?? {}) as { googleClientIds?: GoogleClientIds };
  return extra.googleClientIds ?? {};
}

/**
 * Đăng nhập bằng Google (POST /Auth/google-login).
 *
 * Cần cấu hình Google OAuth client id trong app.json:
 *   expo.extra.googleClientIds = { web, ios, android, expo }
 * Nếu chưa cấu hình, `configured` = false và nút Google nên bị vô hiệu hoá.
 */
export function useGoogleLogin(onSuccess: () => void) {
  const clientIds = readClientIds();
  const configured = Boolean(clientIds.web || clientIds.ios || clientIds.android || clientIds.expo);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: clientIds.web ?? clientIds.expo,
    iosClientId: clientIds.ios,
    androidClientId: clientIds.android,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (!idToken) {
      setError('Không nhận được thông tin đăng nhập từ Google.');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.googleLogin(idToken);
        if (cancelled) return;
        if (res.data?.accessToken) {
          await saveTokens(res.data.accessToken, res.data.refreshToken);
          onSuccess();
        } else {
          setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
        }
      } catch (err: unknown) {
        if (!cancelled) setError(getAuthErrorMessage(err, 'Đăng nhập Google thất bại.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [response, onSuccess]);

  const signIn = useCallback(async () => {
    setError(null);
    if (!configured || !request) {
      setError('Chưa cấu hình Google OAuth (expo.extra.googleClientIds).');
      return;
    }
    await promptAsync();
  }, [configured, request, promptAsync]);

  return { signIn, loading, error, configured, ready: Boolean(request) };
}
