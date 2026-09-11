/**
 * Resolves the ML Kit manifest clash between two libraries we both need.
 *
 * Play Services reads a single meta-data entry to decide which ML Kit models
 * to download when the app installs:
 *
 *     com.google.mlkit.vision.DEPENDENCIES
 *
 * Two of our dependencies each declare it with a different value.
 * @six33/react-native-bg-removal asks for `subject_segment`, which is what cuts
 * the product out of the photo. expo-camera asks for `barcode_ui`. The manifest
 * merger cannot choose between them and fails the build with:
 *
 *     Attribute meta-data#com.google.mlkit.vision.DEPENDENCIES@value
 *     value=(subject_segment) ... is also present at ... value=(barcode_ui)
 *
 * The key accepts a comma-separated list, so the fix is to declare both and
 * tell the merger ours wins. Dropping either one would be wrong: without
 * subject_segment the cut-out silently returns the original photo, and the
 * camera library expects its own entry to be present.
 *
 * This has to be a config plugin rather than an edit to
 * android/app/src/main/AndroidManifest.xml, because android/ is generated and
 * gitignored. A hand edit there disappears on the next `expo prebuild`.
 */

const { withAndroidManifest } = require('expo/config-plugins');

const META_DATA_NAME = 'com.google.mlkit.vision.DEPENDENCIES';
const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

/**
 * @param {import('expo/config').ExpoConfig} config
 * @param {{ models?: string[] }} options Models to request at install time.
 */
module.exports = function withMlKitDependencies(config, options = {}) {
  const models = options.models?.length ? options.models : ['subject_segment', 'barcode_ui'];

  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];

    if (!application) {
      throw new Error('withMlKitDependencies: no <application> element in AndroidManifest');
    }

    // tools:replace is only legal if the tools namespace is declared.
    manifest.$ = manifest.$ ?? {};
    manifest.$['xmlns:tools'] = TOOLS_NAMESPACE;

    const existing = application['meta-data'] ?? [];

    application['meta-data'] = [
      // Drop any entry we are about to supersede, so the merge is unambiguous.
      ...existing.filter((entry) => entry?.$?.['android:name'] !== META_DATA_NAME),
      {
        $: {
          'android:name': META_DATA_NAME,
          'android:value': models.join(','),
          // Without this the merger still reports a conflict with the library
          // manifests rather than accepting ours.
          'tools:replace': 'android:value',
        },
      },
    ];

    return modConfig;
  });
};
