const fs = require('fs');
const path = require('path');
const { withGradleProperties } = require('expo/config-plugins');

const UNITY_GRADLE_PROPERTIES = path.join(
  __dirname,
  '..',
  'unity',
  'builds',
  'android',
  'gradle.properties',
);

const COPY_KEYS = [
  'unity.androidSdkPath',
  'unity.androidNdkPath',
  'unity.androidNdkVersion',
  'unity.jdkPath',
];

function readUnityGradleProperties() {
  if (!fs.existsSync(UNITY_GRADLE_PROPERTIES)) {
    return {};
  }
  const out = {};
  const text = fs.readFileSync(UNITY_GRADLE_PROPERTIES, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (COPY_KEYS.includes(key) && value) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Unity IL2CPP (`:unityLibrary:buildIl2Cpp`) reads gradle properties
 * `unity.androidNdkPath` / `unity.androidSdkPath` from the *root* project.
 * Expo's android/gradle.properties does not include them unless we copy them
 * from unity/builds/android/gradle.properties after each prebuild.
 */
function withUnityGradleProperties(config) {
  const fromUnity = readUnityGradleProperties();
  return withGradleProperties(config, (config) => {
    const next = config.modResults.filter(
      (item) => !(item.type === 'property' && COPY_KEYS.includes(item.key)),
    );
    for (const key of COPY_KEYS) {
      if (fromUnity[key]) {
        next.push({ type: 'property', key, value: fromUnity[key] });
      }
    }
    config.modResults = next;
    return config;
  });
}

module.exports = withUnityGradleProperties;
