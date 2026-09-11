const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadMobile } = require('./load-mobile.cjs');

const setup = () => {
  const harness = loadMobile();
  return { ...harness, config: harness.load('services/config/settings.ts'), direct: harness.load('services/api/directAI.ts'), pricing: harness.load('services/api/localPricing.ts'), transport: harness.load('services/api/geminiTransport.ts') };
};
const success = value => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }) });
const payload = () => ({ transcript: 'A handmade clay pot.', detectedLanguage: 'en', transcriptionQuality: 0.95,
  listing: { title: { en: 'Clay pot' }, description: { en: 'A handmade pot.' }, heritageStory: { en: '' }, bulletFeatures: { en: ['Handmade'] }, extractedAttributes: { material: 'clay', giTag: 'Invented GI' } } });

test('standalone is the default even with a legacy laptop URL', () => {
  const original = process.env.EXPO_PUBLIC_AI_GATEWAY_URL;
  process.env.EXPO_PUBLIC_AI_GATEWAY_URL = 'http://192.168.1.5:8000';
  try { assert.equal(setup().config.defaultSettings().aiMode, 'direct'); }
  finally { if (original === undefined) delete process.env.EXPO_PUBLIC_AI_GATEWAY_URL; else process.env.EXPO_PUBLIC_AI_GATEWAY_URL = original; }
});

test('settings persist securely, replace credentials and can remove the key', async () => {
  const { config, secure } = setup();
  const value = { ...config.defaultSettings(), geminiApiKey: 'first-key', supabaseUrl: '', supabaseAnonKey: '' };
  await config.saveRuntimeSettings(value);
  assert.equal((await config.getRuntimeSettings()).geminiApiKey, 'first-key');
  await config.saveRuntimeSettings({ ...value, geminiApiKey: 'replacement' });
  assert.equal((await config.getRuntimeSettings()).geminiApiKey, 'replacement');
  await config.saveRuntimeSettings({ ...value, geminiApiKey: '' });
  assert.equal((await config.getRuntimeSettings()).geminiApiKey, '');
  assert.equal(secure.size, 1);
});

test('hosted settings reject cleartext URLs and privileged database keys', () => {
  const { config } = setup();
  const base = { ...config.defaultSettings(), supabaseUrl: '', supabaseAnonKey: '' };
  for (const gatewayUrl of ['http://localhost:8000', 'https://user:pass@example.com', 'https://example.com?key=secret']) {
    assert.throws(() => config.validateSettings({ ...base, aiMode: 'gateway', gatewayUrl }));
  }
  const serviceKey = 'eyJ.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.sig';
  for (const supabaseAnonKey of ['sb_secret_private', serviceKey]) assert.throws(() => config.validateSettings({ ...base, supabaseUrl: 'https://demo.supabase.co', supabaseAnonKey }));
  assert.equal(config.validateSettings({ ...base, aiMode: 'gateway', gatewayUrl: 'https://example.com/api/' }).gatewayUrl, 'https://example.com/api');
});

test('cost algorithm matches Python service and never recommends below a fair margin', () => {
  const { pricing } = setup();
  const params = { category: 'textile', rawMaterialCost: 100, laborHours: 2, technique: 'handloom' };
  assert.deepEqual(pricing.calculateCosts(params).breakdown, { rawMaterial: 100, labor: 100, overhead: 20, floorPrice: 220, fairMargin: 55 });
  const advice = { summary: '', summaryRegional: '', confidence: 0.5, comparables: [], adjustments: [{ factor: 'negative', reason: '', impactPercent: -99 }] };
  assert.equal(pricing.priceFromAdvice(params, advice, Date.now()).suggestedPrice.recommended, 275);
  advice.adjustments = Array.from({ length: 5 }, () => ({ factor: 'premium', reason: '', impactPercent: 100 }));
  assert.equal(pricing.priceFromAdvice(params, advice, Date.now()).suggestedPrice.recommended, 440);
  for (const n of [-1, NaN, Infinity]) assert.throws(() => pricing.calculateCosts({ ...params, rawMaterialCost: n }));
  assert.throws(() => pricing.calculateCosts({ category: 'pottery' }), { code: 'INSUFFICIENT_COST_DATA' });
});

test('listing validation refuses noisy and incomplete answers and removes invented GI tags', () => {
  const { direct } = setup();
  assert.equal(direct.validateListing(payload(), ['en'], []).extractedAttributes.giTag, undefined);
  assert.throws(() => direct.validateListing({ ...payload(), transcriptionQuality: 0.2 }, ['en'], []), { code: 'AUDIO_TOO_NOISY' });
  assert.throws(() => direct.validateListing(payload(), ['hi'], []), { code: 'PROCESSING_ERROR' });
  assert.deepEqual(direct.allowedGITags(undefined, 'pottery'), []);
  assert.deepEqual(direct.allowedGITags('nowhere', 'pottery'), []);
  assert.ok(direct.allowedGITags('Jaipur', 'pottery').includes('Blue Pottery of Jaipur'));
});

test('Gemini transport sends credentials only in the Google header and ignores thinking text', async t => {
  const { config, transport } = setup();
  let seen;
  t.mock.method(global, 'fetch', async (url, request) => {
    seen = { url, request };
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private thoughts' }, { text: '{"ok":true}' }] } }] }) };
  });
  await transport.testGeminiConnection({ ...config.defaultSettings(), geminiApiKey: 'test-secret' });
  assert.ok(seen.url.startsWith('https://generativelanguage.googleapis.com/'));
  assert.ok(!seen.url.includes('test-secret'));
  assert.equal(seen.request.headers['x-goog-api-key'], 'test-secret');
  assert.equal(JSON.parse(seen.request.body).generationConfig.responseMimeType, 'application/json');
});

test('mobile recording and transparent-photo MIME types are preserved; oversized audio is rejected before reading', async t => {
  let size = 100;
  let reads = 0;
  const harness = loadMobile({ 'expo-file-system': { File: class {
    get exists() { return true; }
    get size() { return size; }
    async base64() { reads++; return 'YXVkaW8='; }
  } } });
  const config = harness.load('services/config/settings.ts');
  const direct = harness.load('services/api/directAI.ts');
  let body;
  t.mock.method(global, 'fetch', async (_, request) => { body = JSON.parse(request.body); return success(payload()); });
  const settings = { ...config.defaultSettings(), geminiApiKey: 'key' };
  const params = { audioUri: 'file:///recording.m4a', imageUri: 'file:///product.png', sourceLanguage: 'en', targetLanguages: ['en'] };
  await direct.directVoiceToListing(params, settings, {});
  assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'audio/m4a');
  assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'image/png');
  assert.equal(reads, 2);
  size = 10 * 1024 * 1024;
  await assert.rejects(direct.directVoiceToListing(params, settings, {}), { code: 'FILE_TOO_LARGE' });
  assert.equal(reads, 2);
});

test('provider status errors are actionable and do not leak raw responses', async t => {
  const { config, transport } = setup();
  let status = 403;
  t.mock.method(global, 'fetch', async () => ({ ok: false, status, json: async () => ({ error: 'secret echo' }) }));
  for (const [code, expected] of [[403, 'INVALID_API_KEY'], [429, 'RATE_LIMITED'], [404, 'MODEL_UNAVAILABLE'], [500, 'LLM_FAILED']]) {
    status = code;
    await assert.rejects(transport.testGeminiConnection({ ...config.defaultSettings(), geminiApiKey: 'key' }), error => error.code === expected && !error.message.includes('secret echo'));
  }
});

test('cancellation makes no request and timeout aborts fetch', async t => {
  const { config, transport } = setup();
  const settings = { ...config.defaultSettings(), geminiApiKey: 'key' };
  let calls = 0;
  t.mock.method(global, 'fetch', async (_, { signal }) => { calls++; return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))); });
  await assert.rejects(transport.generateJson(settings, [], '', {}, { signal: AbortSignal.abort() }), { code: 'CANCELLED' });
  assert.equal(calls, 0);
  await assert.rejects(transport.generateJson(settings, [], '', {}, { timeoutMs: 5 }), { code: 'TIMEOUT' });
});

test('offline and missing-key pricing use the local minimum; invalid advice is not trusted', async t => {
  const { config, direct } = setup();
  const params = { category: 'pottery', rawMaterialCost: 100, laborHours: 2 };
  const settings = { ...config.defaultSettings(), geminiApiKey: '' };
  const local = await direct.directSuggestPrice(params, settings, {});
  assert.equal(local.reasoning.degraded, true);
  assert.equal(local.suggestedPrice.recommended, 238);
  assert.equal(local.reasoning.sampleSize, 0);
  t.mock.method(global, 'fetch', async () => { throw new Error('offline'); });
  const offline = await direct.directSuggestPrice(params, { ...settings, geminiApiKey: 'key' }, {});
  assert.deepEqual(offline.suggestedPrice, local.suggestedPrice);
  assert.throws(() => direct.validateAdvice({ adjustments: [{ impactPercent: Infinity }] }));
});

test('malformed/truncated model output is rejected', async t => {
  const { config, transport } = setup();
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }) }));
  await assert.rejects(transport.testGeminiConnection({ ...config.defaultSettings(), geminiApiKey: 'key' }), { code: 'PROCESSING_ERROR' });
});

test('API facade reads the newly saved environment on each call', async t => {
  const harness = setup();
  const api = harness.load('services/api/ai.ts');
  const settings = { ...harness.config.defaultSettings(), geminiApiKey: 'key', supabaseUrl: '', supabaseAnonKey: '' };
  await harness.config.saveRuntimeSettings(settings);
  t.mock.method(global, 'fetch', async url => {
    if (url.startsWith('https://gateway.example/')) return { status: 200, text: async () => JSON.stringify({ jobId: 'hosted-result' }) };
    return success({ summary: 'Local', summaryRegional: 'Local', confidence: 0.5, adjustments: [], comparables: [] });
  });
  const params = { category: 'pottery', rawMaterialCost: 100, laborHours: 2 };
  assert.ok((await api.suggestPrice(params)).jobId.startsWith('phone-price-'));
  await harness.config.saveRuntimeSettings({ ...settings, aiMode: 'gateway', gatewayUrl: 'https://gateway.example' });
  assert.equal((await api.suggestPrice(params)).jobId, 'hosted-result');
});

test('SQLite migration preserves existing uploads and binds new uploads to their environment', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(':memory:');
  // A version-1 install, with legacy pending data.
  sqlite.exec("CREATE TABLE sync_outbox (id TEXT PRIMARY KEY, entity_type TEXT, entity_local_id TEXT, operation TEXT, payload TEXT, media_paths TEXT, status TEXT, created_at TEXT, retry_count INTEGER); PRAGMA user_version = 1;");
  sqlite.exec("INSERT INTO sync_outbox VALUES ('legacy','product','old','create','{}',NULL,'pending','2026-01-01',0)");
  let opened = 0;
  const harness = loadMobile({ 'expo-sqlite': { openDatabaseAsync: async () => {
    opened++;
    return {
      execAsync: async sql => sqlite.exec(sql),
      getFirstAsync: async (sql, values = []) => sqlite.prepare(sql).get(...values),
      getAllAsync: async (sql, values = []) => sqlite.prepare(sql).all(...values),
      runAsync: async (sql, values = []) => sqlite.prepare(sql).run(...values),
      withTransactionAsync: async work => { sqlite.exec('BEGIN'); try { await work(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
      closeAsync: async () => {},
    };
  } } });
  const config = harness.load('services/config/settings.ts');
  const database = harness.load('services/offline/database.ts');
  await Promise.all([database.getDatabase(), database.getDatabase()]);
  assert.equal(opened, 1);
  assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 2);
  await database.bindUnassignedOutbox('https://old.example');
  const settings = { ...config.defaultSettings(), supabaseUrl: 'https://new.example', supabaseAnonKey: 'sb_publishable_test' };
  await config.saveRuntimeSettings(settings);
  await database.addToOutbox({ id: 'new', entityType: 'product', entityLocalId: 'new', operation: 'create', payload: { title: 'New' } });
  const rows = await database.getPendingOutboxEntries();
  assert.equal(rows.find(row => row.id === 'legacy').backendUrl, 'https://old.example');
  assert.equal(rows.find(row => row.id === 'new').backendUrl, 'https://new.example');
  await database.bindUnassignedOutbox('https://third.example');
  assert.equal((await database.getPendingOutboxEntries()).find(row => row.id === 'new').backendUrl, 'https://new.example');
  sqlite.close();
});
