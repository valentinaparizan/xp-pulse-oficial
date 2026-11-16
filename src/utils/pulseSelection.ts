import type { Option } from '../types/market.ts';
import { breakEven, optionCost } from './optionsMath.ts';

export type Choice = {
  original: Option;
  position: Option;
  lots: number;
  used: number;
  remaining: number;
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Percentage distance between the stock reference and the option's break-even.
 * This is a way to order educational examples, NOT a forecast or a measure of
 * the probability of profit. CALL and PUT candidates are evaluated separately.
 */
export function breakEvenDistance(option: Option, stockPrice: number): number {
  if (!Number.isFinite(stockPrice) || stockPrice <= 0) return Infinity;
  return Math.abs(breakEven(option) - stockPrice) / stockPrice;
}

/**
 * 1) Prefer affordable options whose break-even is closer to the reference
 *    stock price. This avoids choosing distant strikes merely to spend more.
 * 2) For that chosen series, buy the maximum number of illustrative blocks.
 * 3) Among equal-distance options, minimize the unused budget; the remaining
 *    balance is allocated to fictional fixed income by the journey.
 *
 * The 100-unit historical dataset blocks are illustrative, not certified
 * exchange lot sizes or current executable offers.
 */
export function bestChoice(series: Option[], budget: number, stockPrice: number): Choice | null {
  if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(stockPrice) || stockPrice <= 0) return null;

  const candidates = series.map(original => {
    const lotCost = optionCost(original);
    if (!Number.isFinite(lotCost) || lotCost <= 0 || lotCost > budget) return null;
    const lots = Math.floor((budget + 0.0000001) / lotCost);
    if (lots < 1 || !Number.isSafeInteger(lots)) return null;
    const used = round(lotCost * lots);
    if (used > budget) return null;
    return {
      original,
      position: { ...original, contractSize: original.contractSize * lots },
      lots,
      used,
      remaining: round(budget - used),
    };
  }).filter((candidate): candidate is Choice => candidate !== null);

  candidates.sort((a, b) =>
    breakEvenDistance(a.original, stockPrice) - breakEvenDistance(b.original, stockPrice)
    || a.remaining - b.remaining
    || (b.original.trades || 0) - (a.original.trades || 0)
    || a.original.ticker.localeCompare(b.original.ticker)
  );
  return candidates[0] || null;
}
