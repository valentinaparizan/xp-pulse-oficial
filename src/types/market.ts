export type OptionType = 'CALL' | 'PUT';
export type Direction = 'up' | 'down';
export type Factor = { icon: string; title: string; short: string; detail: string };
export type Stock = { ticker: string; name: string; price: number; sourceDate: string; sourceUrl: string; dataType: string; bull: Factor[]; bear: Factor[] };
export type Option = { ticker: string; underlying: string; type: OptionType; strike: number; premium: number; expiry: string; style: string; contractSize: number; quoteFactor: number; sourceDate: string; sourceUrl: string; dataType: string; premiumType: string; quantityType: string; specificationDate: string };
export type Simulation = { id: string; stock: Stock; option: Option; direction: Direction; reason: string; budget: number; finalPrice: number; createdAt: string };
