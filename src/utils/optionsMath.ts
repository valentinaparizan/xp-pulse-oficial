import type { Option } from '../types/market';
type Contract = Pick<Option, 'type' | 'strike' | 'premium' | 'contractSize' | 'quoteFactor'>;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function optionCost(option: Contract): number { return round(option.premium * option.contractSize / option.quoteFactor); }
export function breakEven(option: Contract): number { return round(option.strike + (option.type === 'CALL' ? 1 : -1) * option.premium / option.quoteFactor); }
export function payoff(option: Contract, price: number) {
  if (!Number.isFinite(price) || price < 0) throw new Error('Preço final inválido');
  const intrinsic = Math.max(option.type === 'CALL' ? price - option.strike : option.strike - price, 0);
  const value = round(intrinsic * option.contractSize);
  return { intrinsic: round(intrinsic), value, cost: optionCost(option), result: round(value - optionCost(option)) };
}
