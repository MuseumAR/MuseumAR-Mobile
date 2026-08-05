import * as FileSystem from 'expo-file-system/legacy';

export type AppLanguage = 'vi' | 'en';

const LANG_FILE = FileSystem.documentDirectory + 'app_language.txt';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

export async function getStoredLanguage(): Promise<AppLanguage> {
  try {
    const info = await FileSystem.getInfoAsync(LANG_FILE);
    if (!info.exists) return 'vi';
    const raw = (await FileSystem.readAsStringAsync(LANG_FILE)).trim().toLowerCase();
    return isAppLanguage(raw) ? raw : 'vi';
  } catch {
    return 'vi';
  }
}

export async function setStoredLanguage(lang: AppLanguage): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(LANG_FILE, lang);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
}
