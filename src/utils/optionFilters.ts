import type { Option, OptionType } from '../types/market';
import { optionCost } from './optionsMath.ts';
export function validOption(o: Option) { return ['CALL','PUT'].includes(o.type) && o.strike > 0 && Number.isFinite(o.strike) && o.premium > 0 && Number.isFinite(o.premium) && o.contractSize > 0 && Number.isInteger(o.contractSize) && o.quoteFactor > 0 && Number.isFinite(o.quoteFactor) && /^\d{4}-\d{2}-\d{2}$/.test(o.expiry) && !!o.sourceDate && !!o.sourceUrl; }
export function selectOptions(options: Option[], underlying: string, type: OptionType, expiry: string, budget: number, stockPrice: number) {
  const available = options.filter(o => validOption(o) && o.underlying === underlying && o.type === type && o.expiry === expiry);
  const affordable = Number.isFinite(budget) && budget > 0 ? available.filter(o => optionCost(o) <= budget) : [];
  affordable.sort((a,b) => Math.abs(a.strike-stockPrice)-Math.abs(b.strike-stockPrice) || a.ticker.localeCompare(b.ticker));
  const minimum = available.length ? Math.min(...available.map(optionCost)) : null;
  return { affordable, minimum };
}
export function availableExpiries(options: Option[], ticker: string, type: OptionType) { return [...new Set(options.filter(o => validOption(o) && o.underlying === ticker && o.type === type).map(o=>o.expiry))].sort(); }
