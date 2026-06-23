import * as FileSystem from 'expo-file-system/legacy';

const TOKEN_FILE_PATH = FileSystem.documentDirectory + 'auth_token.txt';

export async function saveToken(token: string): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(TOKEN_FILE_PATH, token);
  } catch (error) {
    console.error('Error saving token:', error);
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

export async function removeToken(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(TOKEN_FILE_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(TOKEN_FILE_PATH);
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
}
