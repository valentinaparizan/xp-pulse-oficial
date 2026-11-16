import type { Option, Stock } from '../types/market.ts';
import { bestChoice, type Choice } from './pulseSelection.ts';
import { payoff } from './optionsMath.ts';
import { pulseAccounting } from './pulseAccounting.ts';
import archives from '../data/historic-replays.json' with { type: 'json' };

export type HistoricalDirection = 'up' | 'down';
export type HistoricalQuote = {
  ticker: string;
  strike: number;
  premium: number;
  sourceUrl: string;
};
export type HistoricalReplay = {
  id: string;
  ticker: string;
  label: string;
  entryDate: string;
  expiry: string;
  spotEntry: number;
  spotExpiry: number;
  cdiDailyPct: number;
  cdiBusinessDays: number;
  cdiSourceUrl: string;
  options: { up: HistoricalQuote; down: HistoricalQuote };
};
export type HistoricalOpportunity = HistoricalReplay & {
  days: number;
  rise: Choice;
  fall: Choice;
  cdiRate: number;
};

/**
 * Historical prices are sourced independently of the selected direction.
 * The payoff is a theoretical intrinsic value at expiry calculated from the
 * historical stock close, not a claim of realized trading performance.
 */
export const historicalReplays = archives.replays as HistoricalReplay[];
export const historicalMethodology = archives.methodology;

const round = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const dayUTC = (day: string) => Date.parse(day + 'T12:00:00Z');
export function historicalDaysBetween(from: string, to: string): number {
  return Math.round((dayUTC(to) - dayUTC(from)) / 86_400_000);
}

/** SG daily rate % compounded for eligible business days after the historical entry. */
export function historicalCDIRate(replay: HistoricalReplay): number {
  return Math.pow(1 + replay.cdiDailyPct / 100, replay.cdiBusinessDays) - 1;
}

export function historicalOption(replay: HistoricalReplay, direction: HistoricalDirection): Option {
  const quote = replay.options[direction];
  return {
    ticker: quote.ticker,
    underlying: replay.ticker,
    type: direction === 'up' ? 'CALL' : 'PUT',
    strike: quote.strike,
    premium: quote.premium,
    expiry: replay.expiry,
    contractSize: 100,
    quoteFactor: 1,
    sourceDate: replay.entryDate,
    sourceUrl: quote.sourceUrl,
    dataType: 'historical-archived-web',
    premiumType: 'historical-last-trade',
    quantityType: 'illustrative',
    style: 'não confirmado; retorno intrínseco teórico',
    specificationDate: replay.entryDate,
  };
}

export function historicalOpportunity(replay: HistoricalReplay, budget: number): HistoricalOpportunity | null {
  if (!Number.isFinite(budget) || budget < 1 || budget > 1_000_000) return null;
  if (replay.spotEntry <= 0 || replay.spotExpiry <= 0) return null;
  const days = historicalDaysBetween(replay.entryDate, replay.expiry);
  if (days <= 0 || dayUTC(replay.expiry) >= Date.now()) return null; // historical only
  const rise = bestChoice([historicalOption(replay, 'up')], budget, replay.spotEntry);
  const fall = bestChoice([historicalOption(replay, 'down')], budget, replay.spotEntry);
  // Do not display a period unless both possible predictions can be simulated.
  if (!rise || !fall) return null;
  return { ...replay, days, rise, fall, cdiRate: historicalCDIRate(replay) };
}

export function availableHistoricalOpportunities(ticker: string, budget: number): HistoricalOpportunity[] {
  return historicalReplays.filter(r => r.ticker === ticker)
    .map(r => historicalOpportunity(r, budget))
    .filter((r): r is HistoricalOpportunity => r !== null)
    .sort((a,b) => b.entryDate.localeCompare(a.entryDate));
}

export function historicalOutcome(opportunity: HistoricalOpportunity, direction: HistoricalDirection, budget: number) {
  const choice = direction === 'up' ? opportunity.rise : opportunity.fall;
  const optionResult = payoff(choice.position, opportunity.spotExpiry);
  const accounting = pulseAccounting({
    principal: budget,
    optionAmount: choice.used,
    optionValueAtMaturity: optionResult.value,
    fixedIncomeAmount: choice.remaining,
    simulatedRate: opportunity.cdiRate,
  });
  const stockMovement = Math.sign(round(opportunity.spotExpiry - opportunity.spotEntry));
  const matchedDirection = stockMovement === (direction === 'up' ? 1 : -1);
  return { choice, optionResult, accounting, matchedDirection, stockMovement };
}

/** Scenario stock object preserves original company-specific educational factors. */
export function asHistoricalStock(stock: Stock, replay: HistoricalReplay): Stock {
  return { ...stock, price: replay.spotEntry, sourceDate: replay.entryDate,
    sourceUrl: replay.options.up.sourceUrl, dataType: 'historical-archived-web' };
}
