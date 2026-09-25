const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function mergeToolsReplace(app, attrs) {
  const existing = String(app.$['tools:replace'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set([...existing, ...attrs]);
  app.$['tools:replace'] = [...set].join(',');
}

/**
 * Unity UaaL often ships its own launcher icon / MAIN+LAUNCHER activity.
 * - Force the host Expo app icon to win the manifest merge.
 * - Strip LAUNCHER intent-filters from unityLibrary so only MuseumAR shows.
 */
function withUnityManifestMergerFixes(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!manifest.manifest.$) manifest.manifest.$ = {};
    manifest.manifest.$['xmlns:tools'] =
      manifest.manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    app.$['android:enableOnBackInvokedCallback'] =
      app.$['android:enableOnBackInvokedCallback'] || 'false';

    // Beat Unity's default AR / launcher icon in the merged APK.
    app.$['android:icon'] = '@mipmap/ic_launcher';
    app.$['android:roundIcon'] = '@mipmap/ic_launcher_round';

    mergeToolsReplace(app, [
      'android:enableOnBackInvokedCallback',
      'android:icon',
      'android:roundIcon',
    ]);

    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const candidates = [
        path.join(
          config.modRequest.projectRoot,
          'unity',
          'builds',
          'android',
          'unityLibrary',
          'src',
          'main',
          'AndroidManifest.xml',
        ),
        path.join(
          config.modRequest.platformProjectRoot,
          'unityLibrary',
          'src',
          'main',
          'AndroidManifest.xml',
        ),
      ];

      for (const manifestPath of candidates) {
        if (!fs.existsSync(manifestPath)) continue;
        let xml = fs.readFileSync(manifestPath, 'utf8');
        const before = xml;
        // Drop MAIN/LAUNCHER intent-filters so Unity does not own the home-screen icon.
        xml = xml.replace(
          /<intent-filter>[\s\S]*?android\.intent\.action\.MAIN[\s\S]*?<\/intent-filter>/gi,
          (block) =>
            /android\.intent\.category\.LAUNCHER/i.test(block) ? '' : block,
        );
        if (xml !== before) {
          fs.writeFileSync(manifestPath, xml);
          console.log(
            `[withUnityManifestMergerFixes] Removed LAUNCHER from ${manifestPath}`,
          );
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withUnityManifestMergerFixes;
