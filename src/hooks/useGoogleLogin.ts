import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { apiService, getAuthErrorMessage } from '../services/apiService';
import { persistAuthLogin } from '../services/persistAuthLogin';
import { isExpoGo } from '../services/unityAr';

type GoogleClientIds = {
  expo?: string;
  web?: string;
  ios?: string;
  android?: string;
};

function readClientIds(): GoogleClientIds {
  const extra = (Constants.expoConfig?.extra ?? {}) as { googleClientIds?: GoogleClientIds };
  const fromExtra = extra.googleClientIds ?? {};
  return {
    web:
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
      fromExtra.web,
    ios:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
      fromExtra.ios,
    android:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ||
      fromExtra.android,
    expo: fromExtra.expo,
  };
}

function developerErrorHint(): string {
  return (
    'Google đăng nhập thất bại (cấu hình Android). Tạo OAuth client loại Android ' +
    'trên cùng Google Cloud project, package com.museumar.app, dán SHA-1 của keystore, ' +
    'rồi rebuild: npx expo prebuild --clean && npx expo run:android'
  );
}

/**
 * Native Google Sign-In → POST /Auth/google-login with an ID token.
 *
 * The ID token audience is the Web client ID (must match BE GOOGLE_CLIENT_ID).
 * Requires a development/release build (not Expo Go) and an Android OAuth client
 * with this app's package name + SHA-1 fingerprint.
 */
export function useGoogleLogin(onSuccess: () => void) {
  const clientIds = readClientIds();
  const webClientId = (clientIds.web || clientIds.expo || '').trim();
  const configured = webClientId.length > 0;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configuredOnce = useRef(false);

  useEffect(() => {
    if (!configured || configuredOnce.current || isExpoGo()) return;
    try {
      const iosClientId = clientIds.ios?.trim();
      GoogleSignin.configure({
        webClientId,
        ...(iosClientId ? { iosClientId } : {}),
        offlineAccess: false,
        scopes: ['openid', 'profile', 'email'],
      });
      configuredOnce.current = true;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không khởi tạo được Google Sign-In.',
      );
    }
  }, [configured, webClientId, clientIds.ios]);

  const signIn = useCallback(async () => {
    setError(null);

    if (!configured) {
      setError('Chưa cấu hình Google Web Client ID (.env EXPO_PUBLIC_GOOGLE_CLIENT_ID).');
      return;
    }

    if (isExpoGo()) {
      setError('Đăng nhập Google cần development build, không chạy trong Expo Go.');
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      if (GoogleSignin.hasPreviousSignIn()) {
        await GoogleSignin.signOut();
      }

      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) {
        return;
      }
      if (!isSuccessResponse(response)) {
        setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
        return;
      }

      let idToken = response.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        setError('Không nhận được thông tin đăng nhập từ Google.');
        return;
      }

      const res = await apiService.googleLogin(idToken);
      if (res.data?.accessToken) {
        await persistAuthLogin(res.data);
        onSuccess();
      } else {
        setError(res.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
        setError('Đang xử lý đăng nhập Google…');
        return;
      }
      if (
        isErrorWithCode(err) &&
        err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setError('Thiết bị chưa có Google Play Services.');
        return;
      }
      const raw = err instanceof Error ? err.message : '';
      if (
        (isErrorWithCode(err) &&
          (err.code === 'DEVELOPER_ERROR' || err.code === '10')) ||
        /DEVELOPER_ERROR|ApiException:\s*10/i.test(raw)
      ) {
        setError(developerErrorHint());
        return;
      }
      setError(getAuthErrorMessage(err, 'Đăng nhập Google thất bại.'));
    } finally {
      setLoading(false);
    }
  }, [configured, onSuccess]);

  return { signIn, loading, error, configured, ready: configured };
}
