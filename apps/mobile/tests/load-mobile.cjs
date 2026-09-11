// Run the actual service code under Node; substitute only native storage/file boundaries.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');

exports.loadMobile = function (overrides = {}) {
  const cache = new Map();
  const secure = new Map();
  const mocks = {
    'react-native': { Platform: { OS: 'android' } },
    'expo-secure-store': {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
      getItemAsync: async key => secure.get(key) ?? null,
      setItemAsync: async (key, value) => { secure.set(key, value); },
    },
    'expo-file-system': { File: class {
      constructor(uri) { this.path = uri.replace(/^file:\/\//, ''); }
      get exists() { return fs.existsSync(this.path); }
      get size() { return this.exists ? fs.statSync(this.path).size : 0; }
      async base64() { return fs.readFileSync(this.path).toString('base64'); }
    } },
    ...overrides,
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
    }).outputText;
    const localRequire = specifier => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === '@kaarigar/shared-types') return load(path.resolve(__dirname, '../../../packages/shared-types/src/index.ts'));
      if (specifier.startsWith('.')) {
        const target = path.resolve(path.dirname(filename), specifier);
        if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
        if (fs.existsSync(target + '.ts')) return load(target + '.ts');
      }
      return createRequire(filename)(specifier);
    };
    new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return { load: relative => load(path.resolve(__dirname, '..', relative)), secure };
};
