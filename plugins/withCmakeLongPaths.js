const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const CMAKE_VERSION = '3.31.6';
const MARKER = `Force CMake ${CMAKE_VERSION}`;

const GRADLE_SNIPPET = `
// ${MARKER} (Ninja 1.12, Windows paths > 260 chars).
def pinCmakeVersion = { Project p ->
    def apply = {
        def androidExt = p.extensions.findByName("android")
        if (androidExt == null) return
        try {
            androidExt.externalNativeBuild.cmake.version = "${CMAKE_VERSION}"
        } catch (Throwable ignored) {}
    }
    if (p.state.executed) {
        apply()
    } else {
        p.afterEvaluate { apply() }
    }
}
subprojects { pinCmakeVersion(it) }
`;

function defaultSdkPath() {
  return (
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
  );
}

function toLocalPropertiesPath(absPath) {
  return absPath.replace(/\\/g, '\\\\').replace(':', '\\:');
}

function withCmakeLongPaths(config) {
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents =
        config.modResults.contents.trimEnd() + '\n' + GRADLE_SNIPPET;
    }
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(`version "${CMAKE_VERSION}"`)) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /android \{\s*\n(\s*)ndkVersion/,
      `android {\n    externalNativeBuild {\n        cmake {\n            version "${CMAKE_VERSION}"\n        }\n    }\n$1ndkVersion`,
    );
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const localProps = path.join(
        config.modRequest.platformProjectRoot,
        'local.properties',
      );
      const cmakeDir = toLocalPropertiesPath(
        path.join(defaultSdkPath(), 'cmake', CMAKE_VERSION),
      );
      let text = fs.existsSync(localProps)
        ? fs.readFileSync(localProps, 'utf8')
        : '';
      if (/^cmake\.dir=/m.test(text)) {
        text = text.replace(/^cmake\.dir=.*$/m, `cmake.dir=${cmakeDir}`);
      } else {
        text = `${text.trimEnd()}\ncmake.dir=${cmakeDir}\n`;
      }
      fs.writeFileSync(localProps, text.endsWith('\n') ? text : `${text}\n`);
      return config;
    },
  ]);

  return config;
}

module.exports = withCmakeLongPaths;
