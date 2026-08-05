const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/**
 * Unity's unityLibrary sets application@enableOnBackInvokedCallback=true.
 * Expo sets false when predictiveBackGestureEnabled is false.
 * Force a tools:replace so the manifest merger succeeds.
 */
function withUnityManifestMergerFixes(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!manifest.manifest.$) manifest.manifest.$ = {};
    manifest.manifest.$['xmlns:tools'] =
      manifest.manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    app.$['android:enableOnBackInvokedCallback'] =
      app.$['android:enableOnBackInvokedCallback'] || 'false';

    const existing = app.$['tools:replace'];
    const needed = 'android:enableOnBackInvokedCallback';
    if (!existing) {
      app.$['tools:replace'] = needed;
    } else if (!String(existing).split(',').map((s) => s.trim()).includes(needed)) {
      app.$['tools:replace'] = `${existing},${needed}`;
    }

    return config;
  });
}

module.exports = withUnityManifestMergerFixes;
