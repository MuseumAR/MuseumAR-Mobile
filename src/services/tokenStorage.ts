import * as FileSystem from 'expo-file-system/legacy';
import { removeSession } from './sessionStorage';

const TOKEN_FILE_PATH = FileSystem.documentDirectory + 'auth_token.txt';
const REFRESH_TOKEN_FILE_PATH = FileSystem.documentDirectory + 'refresh_token.txt';

export async function saveToken(token: string): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(TOKEN_FILE_PATH, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

/** Lưu cả access token và (tuỳ chọn) refresh token. */
export async function saveTokens(accessToken: string, refreshToken?: string | null): Promise<void> {
  await saveToken(accessToken);
  if (refreshToken) {
    try {
      await FileSystem.writeAsStringAsync(REFRESH_TOKEN_FILE_PATH, refreshToken);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(TOKEN_FILE_PATH);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(TOKEN_FILE_PATH);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(REFRESH_TOKEN_FILE_PATH);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(REFRESH_TOKEN_FILE_PATH);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(TOKEN_FILE_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(TOKEN_FILE_PATH);
    }
    const refreshInfo = await FileSystem.getInfoAsync(REFRESH_TOKEN_FILE_PATH);
    if (refreshInfo.exists) {
      await FileSystem.deleteAsync(REFRESH_TOKEN_FILE_PATH);
    }
    await removeSession();
  } catch (error) {
    console.error('Error removing token:', error);
  }
}
