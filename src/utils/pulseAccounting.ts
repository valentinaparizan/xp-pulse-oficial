/** Educational accounting for the XP Pulse concept, not an actual funded guarantee. */
export type PulseAccountingInput = {
  principal: number;
  optionAmount: number;
  optionValueAtMaturity: number;
  fixedIncomeAmount: number;
  simulatedRate: number;
};

const round = (number: number) => Math.round((number + Number.EPSILON) * 100) / 100;

/**
 * Distinguishes the money the underlying assets actually generate from the
 * unfunded hypothetical supplement needed to reach the academic CDI floor.
 */
export function pulseAccounting(input: PulseAccountingInput) {
  const { principal, optionAmount, optionValueAtMaturity, fixedIncomeAmount, simulatedRate } = input;
  const amounts = [principal, optionAmount, optionValueAtMaturity, fixedIncomeAmount];
  if (amounts.some(value => !Number.isFinite(value) || value < 0)
    || !Number.isFinite(simulatedRate) || simulatedRate < 0
    || Math.abs(optionAmount + fixedIncomeAmount - principal) > 0.011) {
    throw new Error('Composição financeira inválida');
  }
  const optionNetResult = round(optionValueAtMaturity - optionAmount);
  const fixedIncomeAtMaturity = round(fixedIncomeAmount * (1 + simulatedRate));
  const economicValueAtMaturity = round(optionValueAtMaturity + fixedIncomeAtMaturity);
  const hypotheticalFloor = round(principal * (1 + simulatedRate));
  const hypotheticalSupplement = round(Math.max(0, hypotheticalFloor - economicValueAtMaturity));
  const simulatedTotal = round(economicValueAtMaturity + hypotheticalSupplement);
  return {
    optionNetResult,
    fixedIncomeAtMaturity,
    economicValueAtMaturity,
    hypotheticalFloor,
    hypotheticalSupplement,
    simulatedTotal,
    floorApplies: hypotheticalSupplement > 0,
    hypotheticalFloorGain: round(hypotheticalFloor - principal),
  };
}
