import { DEFAULT_PRICING_CONFIG as config } from '@kaarigar/shared-types';
import type { PricingParams, PricingResult, CostBreakdown } from './ai';
import { AIServiceError } from './errors';

export interface PricingAdvice {
  summary: string;
  summaryRegional: string;
  confidence: number;
  adjustments: Array<{ factor: string; impactPercent: number; reason: string }>;
  comparables: Array<{ title: string; price: number }>;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function calculateCosts(params: PricingParams): { breakdown: CostBreakdown; ceiling: number } {
  const rawMaterial = params.rawMaterialCost ?? 0;
  const hours = params.laborHours ?? 0;
  if (![rawMaterial, hours].every(n => Number.isFinite(n) && n >= 0)) {
    throw new AIServiceError('INSUFFICIENT_COST_DATA', 'Enter valid non-negative material costs and work hours.');
  }
  const labor = hours * (config.laborRatePerHour[params.category] ?? config.laborRatePerHour.other);
  const overhead = (rawMaterial + labor) * config.overheadPercentage / 100;
  const floorPrice = rawMaterial + labor + overhead;
  if (!Number.isFinite(floorPrice) || floorPrice <= 0) throw new AIServiceError('INSUFFICIENT_COST_DATA', 'Enter your material costs and work hours.');
  const band = params.giTag ? config.marginRange.giTagged
    : /hand|carv|block|filigree|inlay/i.test(params.technique ?? '') ? config.marginRange.traditional : config.marginRange.common;
  return {
    breakdown: { rawMaterial: round(rawMaterial), labor: round(labor), overhead: round(overhead), floorPrice: round(floorPrice), fairMargin: round(floorPrice * band.min / 100) },
    ceiling: floorPrice * (1 + band.max / 100),
  };
}

export function priceFromAdvice(params: PricingParams, advice: PricingAdvice | null, started: number): PricingResult {
  const { breakdown, ceiling } = calculateCosts(params);
  const minimum = breakdown.floorPrice + breakdown.fairMargin;
  const adjustments = advice?.adjustments ?? [];
  const total = Math.max(-20, Math.min(60, adjustments.reduce((sum, item) => sum + item.impactPercent, 0)));
  const recommended = Math.max(minimum, minimum * (1 + total / 100));
  return {
    jobId: `phone-price-${Date.now()}`,
    suggestedPrice: { min: Math.ceil(minimum), recommended: Math.ceil(recommended), max: Math.ceil(Math.max(recommended, ceiling)), currency: 'INR' },
    reasoning: {
      summary: advice?.summary ?? 'This price covers your entered materials, work hours, overhead and a fair margin. AI market advice was unavailable; treat this as a cost-based minimum.',
      summaryRegional: advice?.summaryRegional,
      costBreakdown: breakdown,
      marketComparables: (advice?.comparables ?? []).map(item => ({ ...item, price: Math.round(item.price), source: 'ai_estimate' })),
      adjustments: adjustments.map(item => ({ factor: item.factor, impact: `${item.impactPercent >= 0 ? '+' : ''}${item.impactPercent}%`, reason: item.reason })),
      confidence: advice?.confidence ?? 0.3, sampleSize: 0, degraded: !advice,
    },
    processingTimeMs: Date.now() - started,
  };
}
