/**
 * Pins the Android SDK CMake version so the C++ build survives Windows paths.
 *
 * React Native's New Architecture generates codegen sources whose object file
 * names embed the full absolute path of the source. For react-native-gesture-
 * handler that reaches roughly 420 characters, and the build dies with:
 *
 *     ninja: error: Stat(...RNGestureHandlerDetectorShadowNode.cpp.o):
 *            Filename longer than 260 characters
 *
 * Moving the project to a shorter directory does not fix it. The fixed portion
 * of that object path is already past 300 characters before the project root
 * is counted at all, so no root is short enough.
 *
 * The real fix is the toolchain. Ninja gained long path support in 1.12, and
 * the Android SDK bundles ninja with each CMake release:
 *
 *     cmake 3.22.1  ->  ninja 1.10.2   no long path support
 *     cmake 4.1.2   ->  ninja 1.12.1   works
 *
 * Gradle otherwise picks the oldest installed CMake, which is why this has to
 * be declared. It must be a config plugin rather than an edit to
 * android/app/build.gradle, because android/ is generated and gitignored.
 *
 * Anyone building this project needs the pinned version installed:
 *
 *     sdkmanager "cmake;4.1.2"
 *
 * Harmless on macOS and Linux, where the limit does not exist, as long as the
 * same CMake is installed.
 */

const { withAppBuildGradle } = require('expo/config-plugins');

const DEFAULT_VERSION = '4.1.2';

/**
 * @param {import('expo/config').ExpoConfig} config
 * @param {{ version?: string }} options
 */
module.exports = function withCmakeVersion(config, options = {}) {
  const version = options.version ?? DEFAULT_VERSION;

  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (contents.includes('// kaarigar:cmake-version')) {
      return modConfig;
    }

    const anchor = /^android\s*\{/m;
    if (!anchor.test(contents)) {
      throw new Error('withCmakeVersion: could not find the android { } block');
    }

    const block = [
      'android {',
      '    // kaarigar:cmake-version',
      '    // Pinned for ninja >= 1.12, which handles Windows paths over 260',
      '    // characters. See plugins/withCmakeVersion.js.',
      '    externalNativeBuild {',
      '        cmake {',
      `            version "${version}"`,
      '        }',
      '    }',
    ].join('\n');

    modConfig.modResults.contents = contents.replace(anchor, block);
    return modConfig;
  });
};
