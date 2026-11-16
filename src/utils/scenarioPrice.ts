import type { Direction } from '../types/market.ts';

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** An illustrative movement, never a forecast or a real market quote. */
export const DEFAULT_SCENARIO_CHANGE = 0.10;

export function suggestedFinalPrice(spot: number, direction: Direction): number {
  if (!Number.isFinite(spot) || spot <= 0) throw new Error('Preço histórico inválido');
  return round(spot * (direction === 'up' ? 1 + DEFAULT_SCENARIO_CHANGE : 1 - DEFAULT_SCENARIO_CHANGE));
}

/** Accept Brazilian cents without allowing ambiguous thousands or negatives. */
export function parseScenarioPrice(input: string): number | null {
  const normalized = input.trim().replace(/^R\$\s*/i, '').trim();
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(normalized)) return null;
  const price = Number(normalized.replace(',', '.'));
  return Number.isFinite(price) && price >= 0 && price <= 1000000 ? round(price) : null;
}

export function formatScenarioPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

export function scenarioMovement(spot: number, final: number): 'up' | 'down' | 'flat' {
  const delta = round(final - spot);
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
}

export function scenarioChangePercent(spot: number, final: number): number {
  return round((final / spot - 1) * 100);
}
