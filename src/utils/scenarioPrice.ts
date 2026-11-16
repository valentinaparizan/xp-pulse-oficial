/**
 * Simulação educativa de um preço futuro, NÃO uma previsão e NÃO uma cotação real.
 * O movimento é sorteado de modo independente da opinião (subida/queda) do usuário.
 * Usa volatilidade anual hipotética de 35%, sem calibração histórica.
 */
export const ASSUMED_ANNUAL_VOLATILITY = 0.35;

export type AutomaticScenario = {
  finalPrice: number;
  changePercent: number;
  volatility: number;
  days: number;
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const boundedRandom = (random: () => number) => {
  const v = random();
  if (!Number.isFinite(v) || v < 0 || v >= 1) throw new Error('Amostra aleatória inválida');
  return Math.max(1e-12, v);
};

/**
 * Modelo lognormal, sem tendência direcional presumida (E[S_T] = S_0).
 * Preço inicial histórico e opções são da mesma data-base do arquivo B3.
 * A simulação NÃO pode ser usada para inferir que a previsão se realizará.
 *
 * Injeta-se o gerador aleatório em testes para resultados reproduzíveis.
 */
export function generateAutomaticScenario(spot: number, days: number, random: () => number = Math.random): AutomaticScenario {
  if (!Number.isFinite(spot) || spot <= 0 || !Number.isFinite(days) || days <= 0) {
    throw new Error('Preço inicial ou prazo inválido');
  }
  const u1 = boundedRandom(random);
  const u2 = boundedRandom(random);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const horizon = days / 365;
  const sigma = ASSUMED_ANNUAL_VOLATILITY;
  const finalPrice = round(spot * Math.exp(-0.5 * sigma * sigma * horizon + sigma * Math.sqrt(horizon) * z));
  return {
    finalPrice,
    changePercent: round((finalPrice / spot - 1) * 100),
    volatility: sigma,
    days,
  };
}

export function scenarioMovement(spot: number, final: number): 'up' | 'down' | 'flat' {
  const delta = round(final - spot);
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
}

export function scenarioChangePercent(spot: number, final: number): number {
  return round((final / spot - 1) * 100);
}
