/**
 * Dynamic Expo config — Google / API values come from `.env`.
 * Expo loads `.env` into process.env before this file runs.
 */
const appJson = require('./app.json');

function googleIosUrlScheme(clientId) {
  const id = String(clientId || '').trim();
  const suffix = '.apps.googleusercontent.com';
  if (!id.endsWith(suffix)) return '';
  return `com.googleusercontent.apps.${id.slice(0, -suffix.length)}`;
}

module.exports = () => {
  const expo = { ...appJson.expo };
  const web = (
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ''
  ).trim();
  const ios = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();
  const android = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim();
  const apiHost = (
    process.env.EXPO_PUBLIC_API_HOST ||
    expo.extra?.apiHost ||
    ''
  ).trim();

  expo.extra = {
    ...expo.extra,
    apiHost,
    googleClientIds: {
      web,
      ios,
      android,
      expo: '',
    },
  };

  const scheme = googleIosUrlScheme(ios || web);
  expo.plugins = (expo.plugins || []).map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name === '@react-native-google-signin/google-signin') {
      return scheme ? [name, { iosUrlScheme: scheme }] : name;
    }
    return plugin;
  });

  return { expo };
};
