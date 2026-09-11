// Optional integration check: node tests/live-smoke.cjs /absolute/path/to/sample.wav
// Uses the existing local service credential without printing or bundling it.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { loadMobile } = require('./load-mobile.cjs');

async function main() {
  const envPath = path.resolve(__dirname, '../../ai-services/voice-cataloger/.env');
  const contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const key = process.env.GEMINI_API_KEY || contents.match(/^GEMINI_API_KEY\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
  if (!key) throw new Error('No local GEMINI_API_KEY is configured.');
  const harness = loadMobile();
  const direct = harness.load('services/api/directAI.ts');
  const settings = { ...harness.load('services/config/settings.ts').defaultSettings(), geminiApiKey: key };
  if (!process.env.SMOKE_PRICING_ONLY) {
  const audioUri = path.resolve(process.argv[2]).replace(/\\/g, '/');
  const listing = await direct.directVoiceToListing({ audioUri, sourceLanguage: 'en', targetLanguages: ['en', 'hi'], productCategory: 'pottery' }, settings, {});
  assert.ok(listing.transcription.originalText.length > 10);
  assert.ok(listing.listing.title.en);
  assert.ok(listing.listing.title.hi);
  assert.equal(listing.listing.extractedAttributes.giTag, undefined);
  console.log(JSON.stringify({ check: 'direct bilingual audio listing', passed: true, model: settings.geminiModel, milliseconds: listing.processingTimeMs }));
  }
  if (process.env.SMOKE_LISTING_ONLY) return;
  const pricing = await direct.directSuggestPrice({ category: 'pottery', rawMaterialCost: 100, laborHours: 2, language: 'hi' }, settings, {});
  assert.equal(pricing.reasoning.degraded, false, 'Live pricing should receive valid AI advice, not fall back.');
  assert.ok(pricing.suggestedPrice.recommended >= pricing.suggestedPrice.min);
  assert.equal(pricing.reasoning.sampleSize, 0);
  console.log(JSON.stringify({ check: 'direct Gemini pricing', passed: true, milliseconds: pricing.processingTimeMs }));
}
main().catch(error => { console.error(error.code || 'SMOKE_FAILED', error.message); process.exitCode = 1; });
