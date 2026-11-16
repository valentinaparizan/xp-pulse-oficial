import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { generateAutomaticScenario, ASSUMED_ANNUAL_VOLATILITY, scenarioMovement, scenarioChangePercent } from './scenarioPrice.ts';
import assert from 'node:assert/strict';
import { payoff, optionCost, breakEven, riskMetrics } from './optionsMath.ts';
import { pulseAccounting } from './pulseAccounting.ts';
import { bestChoice, breakEvenDistance } from './pulseSelection.ts';
import { historicalReplays, historicalOpportunity, availableHistoricalOpportunities, historicalOutcome, historicalCDIRate } from './historicalReplay.ts';
import { parseCotahist } from './cotahist.ts';
import { selectOptions, availableExpiries } from './optionFilters.ts';
import { journeyAvailability, safeJourneyStep } from './journey.ts';
import type { Option } from '../types/market.ts';
const call:Option={ticker:'TEST',underlying:'TEST4',type:'CALL',strike:32,premium:.42,contractSize:100,quoteFactor:1,expiry:'2026-10-16',sourceDate:'2026-09-30',sourceUrl:'https://example.com',dataType:'illustrative',premiumType:'illustrative',quantityType:'illustrative',style:'test',specificationDate:'2026-09-30'};
test('múltiplo é lucro líquido / prêmio, não valor bruto nem probabilidade',()=>{const o={...call,premium:.3};assert.equal(riskMetrics(o,33.2).multiple,3);assert.equal(riskMetrics(o,32.9).multiple,2);assert.equal(riskMetrics(o,0).multiple,-1);assert.equal(riskMetrics(o,32.3).multiple,0);assert.equal(riskMetrics(o,33).maxProfit,null);assert.equal(riskMetrics({...o,type:'PUT'},30).maxProfit,3170);});
function row(ticker:string,market:string,overrides:Record<number,string>={}){const r=Array(245).fill(' ');const fields:Record<number,string>={0:'01',2:'20261002',12:ticker.padEnd(12),24:market,39:'PN        ',52:'R$  ',108:'0000000000030',147:'00012',170:'000000000000003000',188:'0000000003200',201:'0',202:'20261016',210:'0000001',230:'BRTESTACNPR1',...overrides};for(const [p,v] of Object.entries(fields))for(let i=0;i<v.length;i++)r[Number(p)+i]=v[i];return r.join('');}
function file(rows:string[]){return ['00COTAHIST'.padEnd(245),...rows,('99COTAHIST'.padEnd(31)+String(rows.length).padStart(11,'0')).padEnd(245)].join('\n');}
const parse=(rows:string[])=>parseCotahist(file([row('TEST4','010',{108:'0000000003200'}),...rows]),['TEST4'],'2026-10-05','https://example.com');
test('COTAHIST decodifica CALL, PUT, prêmio, strike, vencimento e negócios',()=>{const d=parse([row('TESTJ32','070'),row('TESTV32','080')]);assert.equal(d.stocks[0].price,32);assert.equal(d.options[0].premium,.3);assert.equal(d.options[0].strike,32);assert.equal(d.options[0].expiry,'2026-10-16');assert.equal(d.options[0].trades,12);assert.deepEqual(d.options.map(o=>o.type),['CALL','PUT']);});
test('COTAHIST não confunde classe da ação, ISIN, exercício ou série vencida',()=>{const d=parse([row('GOOD','070'),row('WRONGCLASS','070',{39:'ON        '}),row('WRONGISIN','070',{230:'BROTHERACNPR'}),row('EXERCISE','012'),row('EXPIRED','080',{202:'20261002'}),row('FACTOR','070',{210:'0000100'}),row('ZERO','070',{108:'0000000000000'})]);assert.deepEqual(d.options.map(o=>o.ticker),['GOOD']);assert.deepEqual(d.metadata.excluded,{expired:1,unsupported:1,noPrice:1});});
test('COTAHIST rejeita duplicatas, truncamento, datas futuras e arquivo sem séries',()=>{assert.throws(()=>parse([row('DUP','070'),row('DUP','070')]));assert.throws(()=>parse([row('BAD','070').slice(0,-1)]));assert.throws(()=>parse([row('FUTURE','070',{2:'20261006'})]));assert.throws(()=>parse([]));assert.throws(()=>parseCotahist('00COTAHIST',[], '2026-10-05',''));});
test('CALL: perda total, equilíbrio e ganho no vencimento',()=>{assert.equal(optionCost(call),42);assert.equal(payoff(call,0).result,-42);assert.equal(payoff(call,32).result,-42);assert.equal(payoff(call,32.42).result,0);assert.equal(payoff(call,38).result,558);assert.equal(breakEven(call),32.42);});
test('PUT: perda limitada ao prêmio, equilíbrio e ganho',()=>{const put={...call,type:'PUT' as const};assert.equal(payoff(put,38).result,-42);assert.equal(payoff(put,31.58).result,0);assert.equal(payoff(put,28).result,358);assert.equal(payoff(put,0).result,3158);assert.equal(breakEven(put),31.58);});
test('fator de cotação e quantidade não são confundidos',()=>{assert.equal(optionCost({...call,quoteFactor:100}),.42);assert.equal(payoff({...call,quoteFactor:100},33).result,99.58);});
test('filtros: direção, vencimento, ativo, orçamento, dados inválidos e strike mais próximo',()=>{const data=[call,{...call,ticker:'NEAR',strike:30,premium:.5},{...call,ticker:'PUT',type:'PUT' as const},{...call,ticker:'OTHER',underlying:'OTHER4'},{...call,ticker:'DATE',expiry:'2026-12-18'},{...call,ticker:'BAD',premium:NaN}];assert.deepEqual(selectOptions(data,'TEST4','CALL','2026-10-16',50,30).affordable.map(x=>x.ticker),['NEAR','TEST']);assert.equal(selectOptions(data,'TEST4','CALL','2026-10-16',20,30).minimum,42);assert.equal(selectOptions(data,'TEST4','CALL','2026-10-16',-1,30).affordable.length,0);assert.equal(selectOptions(data,'UNKNOWN','CALL','2026-10-16',50,30).minimum,null);assert.deepEqual(availableExpiries(data,'TEST4','PUT'),['2026-10-16']);});
test('preço negativo ou não finito é rejeitado',()=>{assert.throws(()=>payoff(call,-1));assert.throws(()=>payoff(call,NaN));});
test('comparação de orçamento: mais limite não multiplica a posição',()=>{const low=selectOptions([call],'TEST4','CALL',call.expiry,50,32).affordable[0];const high=selectOptions([call],'TEST4','CALL',call.expiry,100,32).affordable[0];assert.equal(low.ticker,high.ticker);assert.equal(payoff(low,35).result,payoff(high,35).result);assert.equal(100-optionCost(high),58);assert.equal(selectOptions([call],'TEST4','CALL',call.expiry,25,32).affordable.length,0);});
test('comparação de prazo mantém as séries separadas, sem inventar preços',()=>{const later={...call,ticker:'LATER',expiry:'2026-12-18',premium:1.2};assert.equal(selectOptions([call,later],'TEST4','CALL',later.expiry,100,32).affordable.length,0);assert.equal(selectOptions([call,later],'TEST4','CALL',later.expiry,150,32).affordable[0].ticker,'LATER');assert.equal(selectOptions([call,later],'TEST4','PUT',later.expiry,150,32).minimum,null);});
test('jornada bloqueia CALL de 120 para orçamento de 100 sem bloquear PUT acessível',()=>{const data=[{...call,premium:1.2},{...call,type:'PUT' as const,premium:.42}];const a=journeyAvailability(data,'TEST4',100,call.expiry);assert.equal(a.canContinue,true);assert.equal(a.directions[0].enabled,false);assert.equal(a.directions[0].minimum,120);assert.equal(a.directions[1].enabled,true);assert.equal(journeyAvailability(data,'TEST4',120,call.expiry).directions[0].enabled,true);});
test('jornada bloqueia prazo caro, orçamento inválido e direção sem série',()=>{const data=[call,{...call,expiry:'2026-12-18',premium:1.2}];const a=journeyAvailability(data,'TEST4',100,'2026-12-18');assert.equal(a.canContinue,false);assert.equal(a.dates[0].enabled,true);assert.equal(a.dates[1].enabled,false);assert.equal(a.directions[1].minimum,null);for(const b of [0,-1,NaN,Infinity,1000001])assert.equal(journeyAvailability(data,'TEST4',b,call.expiry).canContinue,false);});
test('links diretos e rascunhos não avançam com seleção ou motivo inválido',()=>{assert.equal(safeJourneyStep(5,false,false,false),1);assert.equal(safeJourneyStep(4,true,false,true),2);assert.equal(safeJourneyStep(5,true,true,false),3);assert.equal(safeJourneyStep(5,true,true,true),5);assert.equal(safeJourneyStep(0,false,false,false),0);});
test('CALL: estar dentro do dinheiro ainda pode significar perda parcial',()=>{const p=payoff(call,32.21);assert.equal(p.value,21);assert.equal(p.cost,42);assert.equal(p.result,-21);});
test('PUT: as faixas de lucro e prejuízo invertem o sentido do preço',()=>{const put={...call,type:'PUT' as const};assert.equal(payoff(put,32).result,-42);assert.equal(payoff(put,31.79).result,-21);assert.equal(payoff(put,31.58).result,0);assert.ok(payoff(put,31.57).result>0);assert.equal(payoff(put,33).value,0);});
test('limites da CALL distinguem strike e equilíbrio em centavos',()=>{assert.equal(payoff(call,32).value,0);assert.equal(payoff(call,32.01).result,-41);assert.equal(payoff(call,32.41).result,-1);assert.equal(payoff(call,32.42).result,0);assert.equal(payoff(call,32.43).result,1);});

test('Pulse: opção perde tudo, renda fixa zero e complemento fictício não é rendimento da renda fixa', () => {
  const p = pulseAccounting({principal:200,optionAmount:200,optionValueAtMaturity:0,fixedIncomeAmount:0,simulatedRate:0.0619});
  assert.equal(p.optionNetResult,-200);
  assert.equal(p.fixedIncomeAtMaturity,0);
  assert.equal(p.economicValueAtMaturity,0);
  assert.equal(p.hypotheticalFloor,212.38);
  assert.equal(p.hypotheticalSupplement,212.38);
  assert.equal(p.simulatedTotal,212.38);
  assert.equal(p.hypotheticalFloorGain,12.38);
  assert.equal(p.floorApplies,true);
});
test('Pulse: lucro da opção e sobra em renda fixa não recebem complemento fictício quando superam o piso', () => {
  const p = pulseAccounting({principal:100,optionAmount:90,optionValueAtMaturity:130,fixedIncomeAmount:10,simulatedRate:.0364});
  assert.equal(p.optionNetResult,40);
  assert.equal(p.fixedIncomeAtMaturity,10.36);
  assert.equal(p.economicValueAtMaturity,140.36);
  assert.equal(p.hypotheticalFloor,103.64);
  assert.equal(p.hypotheticalSupplement,0);
  assert.equal(p.simulatedTotal,140.36);
  assert.equal(p.floorApplies,false);
});
test('Pulse: perda das opções exige complemento; renda fixa não é confundida com garantia', () => {
  const p = pulseAccounting({principal:100,optionAmount:90,optionValueAtMaturity:0,fixedIncomeAmount:10,simulatedRate:.0364});
  assert.equal(p.fixedIncomeAtMaturity,10.36);
  assert.equal(p.hypotheticalFloor,103.64);
  assert.equal(p.hypotheticalSupplement,93.28);
  assert.equal(p.simulatedTotal,103.64);
});
test('Pulse: 100% em renda fixa não cria complemento quando o piso usa a mesma taxa', () => {
  const p = pulseAccounting({principal:100,optionAmount:0,optionValueAtMaturity:0,fixedIncomeAmount:100,simulatedRate:.0364});
  assert.equal(p.fixedIncomeAtMaturity,103.64);
  assert.equal(p.hypotheticalSupplement,0);
  assert.equal(p.simulatedTotal,103.64);
});
test('Pulse: composição inválida não permite inventar recursos fora do principal', () => {
  assert.throws(() => pulseAccounting({principal:100,optionAmount:100,optionValueAtMaturity:0,fixedIncomeAmount:50,simulatedRate:.03}));
});


test('Pulse: preço de equilíbrio próximo tem prioridade sobre gastar 100% em opção muito distante', () => {
  const close = { ...call, ticker:'CLOSE', strike:32, premium:.42 };
  const remote = { ...call, ticker:'REMOTE', strike:85, premium:.01 };
  const selected = bestChoice([remote, close], 100, 32);
  assert.equal(selected?.original.ticker, 'CLOSE');
  assert.equal(selected?.lots, 2);
  assert.equal(selected?.position.contractSize, 200);
  assert.equal(selected?.used, 84);
  assert.equal(selected?.remaining, 16);
  assert.ok(breakEvenDistance(close,32) < breakEvenDistance(remote,32));
});
test('Pulse: em pontos de equilíbrio iguais, usa mais orçamento em opções e sobra vai para renda fixa', () => {
  const a = { ...call, ticker:'A', strike:32, premium:.42 };
  const b = { ...call, ticker:'B', strike:32.12, premium:.30 };
  assert.equal(breakEvenDistance(a,32),breakEvenDistance(b,32));
  const selected = bestChoice([a,b],100,32);
  assert.equal(selected?.original.ticker,'B');
  assert.equal(selected?.used,90);
  assert.equal(selected?.remaining,10);
  const returned = pulseAccounting({principal:100,optionAmount:selected!.used,optionValueAtMaturity:120,fixedIncomeAmount:selected!.remaining,simulatedRate:.03});
  assert.equal(returned.fixedIncomeAtMaturity,10.3);
  assert.equal(returned.simulatedTotal,130.3);
});
test('Pulse: critério de proximidade funciona também para alternativas de queda', () => {
  const near = { ...call, ticker:'NEAR_PUT', type:'PUT' as const, strike:32, premium:.42 };
  const far = { ...call, ticker:'FAR_PUT', type:'PUT' as const, strike:10, premium:.01 };
  const selected = bestChoice([far,near],100,32);
  assert.equal(selected?.original.ticker,'NEAR_PUT');
  assert.equal(selected?.position.contractSize,200);
});
test('Pulse: nunca compra bloco que exceda orçamento e não seleciona se não existir opção acessível', () => {
  assert.equal(bestChoice([{ ...call,premium:1.5 }],100,32),null);
  assert.equal(bestChoice([call],-100,32),null);
  assert.equal(bestChoice([call],100,0),null);
});

test('resultado líquido total: soma componentes positivos e não soma CDI de referência duas vezes', () => {
  const rate = Math.pow(1.012, 32 / 30) - 1;
  const r = pulseAccounting({principal:200,optionAmount:190,optionValueAtMaturity:238,fixedIncomeAmount:10,simulatedRate:rate});
  assert.equal(r.optionNetResult,48);
  assert.equal(r.fixedIncomeAtMaturity,10.13);
  assert.equal(r.fixedIncomeNetResult,.13);
  assert.equal(r.hypotheticalFloorGain,2.56);
  assert.equal(r.hypotheticalSupplement,0);
  assert.equal(r.totalNetResult,48.13);
  assert.equal(r.simulatedTotal,248.13);
  assert.equal(r.totalNetResult,r.optionNetResult+r.fixedIncomeNetResult+r.hypotheticalSupplement);
  assert.equal(r.simulatedTotal,roundForTest(200+r.totalNetResult));
});
test('resultado líquido total: perda da opção é compensada SOMENTE por complemento hipotético', () => {
  const rate = Math.pow(1.012, 32 / 30) - 1;
  const r = pulseAccounting({principal:200,optionAmount:190,optionValueAtMaturity:0,fixedIncomeAmount:10,simulatedRate:rate});
  assert.equal(r.optionNetResult,-190);
  assert.equal(r.fixedIncomeNetResult,.13);
  assert.equal(r.hypotheticalFloorGain,2.56);
  assert.equal(r.hypotheticalSupplement,192.43);
  assert.equal(r.totalNetResult,2.56);
  assert.equal(r.simulatedTotal,202.56);
  assert.equal(r.totalNetResult,roundForTest(r.optionNetResult+r.fixedIncomeNetResult+r.hypotheticalSupplement));
});
test('resultado líquido total: aporte totalmente em opções e perda integral não vira juros de renda fixa', () => {
  const r = pulseAccounting({principal:100,optionAmount:100,optionValueAtMaturity:0,fixedIncomeAmount:0,simulatedRate:.03});
  assert.equal(r.optionNetResult,-100);
  assert.equal(r.fixedIncomeNetResult,0);
  assert.equal(r.hypotheticalSupplement,103);
  assert.equal(r.totalNetResult,3);
  assert.equal(r.simulatedTotal,103);
});
function roundForTest(n:number){return Math.round((n+Number.EPSILON)*100)/100;}

test('modelo sorteia alta e queda sem receber a direção escolhida como argumento', () => {
  assert.equal(ASSUMED_ANNUAL_VOLATILITY, .35);
  const randomUp = [Math.exp(-.5), 0][Symbol.iterator]();
  const randomDown = [Math.exp(-.5), .5][Symbol.iterator]();
  const up = generateAutomaticScenario(19,32,()=>randomUp.next().value!);
  const down = generateAutomaticScenario(19,32,()=>randomDown.next().value!);
  assert.ok(up.finalPrice > 19);
  assert.ok(down.finalPrice < 19);
  assert.equal(scenarioMovement(19,up.finalPrice),'up');
  assert.equal(scenarioMovement(19,down.finalPrice),'down');
  assert.equal(scenarioMovement(19,19),'flat');
  assert.ok(up.changePercent > 0);
  assert.ok(down.changePercent < 0);
  assert.equal(scenarioChangePercent(19,up.finalPrice),up.changePercent);
  assert.equal(scenarioChangePercent(19,down.finalPrice),down.changePercent);
});
test('simulação automática é reproduzível para mesma amostra e depende do prazo', () => {
  const get=()=>{const draws=[Math.exp(-.5),0][Symbol.iterator]();return()=>draws.next().value!;};
  const a=generateAutomaticScenario(19,32,get());
  const b=generateAutomaticScenario(19,32,get());
  const longer=generateAutomaticScenario(19,120,get());
  assert.deepEqual(a,b);
  assert.notEqual(a.finalPrice,longer.finalPrice);
  assert.ok(a.finalPrice>=0);
  for(const invalid of [-1,1,NaN]) assert.throws(()=>generateAutomaticScenario(19,32,()=>invalid));
  assert.ok(generateAutomaticScenario(19,32,()=>0).finalPrice>=0);
  assert.throws(()=>generateAutomaticScenario(0,32,()=>.5));
  assert.throws(()=>generateAutomaticScenario(19,0,()=>.5));
});
test('exemplo B3: cenário favorável independente pode gerar lucro real da opção, mas cenário adverso gera perda', () => {
  const opts = JSON.parse(readFileSync(new URL('../data/options.json', import.meta.url), 'utf8')) as Option[];
  const selected = bestChoice(opts.filter(o => o.underlying === 'B3SA3' && o.expiry === '2026-12-18' && o.type === 'CALL'), 200,19);
  assert.ok(selected);
  assert.equal(selected.original.ticker,'B3SAL189');
  assert.equal(selected.used,190);
  assert.equal(selected.remaining,10);
  const sample=(cosArg:number)=>{const iter=[Math.exp(-.5),cosArg][Symbol.iterator]();return generateAutomaticScenario(19,32,()=>iter.next().value!);};
  const up=sample(0);
  const down=sample(.5);
  const favorable=payoff(selected.position,up.finalPrice);
  const adverse=payoff(selected.position,down.finalPrice);
  assert.ok(favorable.result>0);
  assert.ok(adverse.result<0);
  const rate=Math.pow(1.012,32/30)-1;
  const good=pulseAccounting({principal:200,optionAmount:selected.used,optionValueAtMaturity:favorable.value,fixedIncomeAmount:selected.remaining,simulatedRate:rate});
  const bad=pulseAccounting({principal:200,optionAmount:selected.used,optionValueAtMaturity:adverse.value,fixedIncomeAmount:selected.remaining,simulatedRate:rate});
  assert.equal(good.hypotheticalSupplement,0);
  assert.ok(good.simulatedTotal>200);
  assert.ok(bad.hypotheticalSupplement>0);
  assert.equal(bad.totalNetResult,bad.hypotheticalFloorGain);
});
test('a jornada ativa não expõe escolha do preço futuro ou resultado ao usuário', () => {
  const active = readFileSync(new URL('../PulseJourney.tsx', import.meta.url), 'utf8');
  assert.ok(active.includes('StockFactorsExplorer'));
  assert.ok(active.includes('generateAutomaticScenario(stock.price, chosen.days)'));
  assert.ok(active.includes('readOnly protection='));
  assert.ok(!active.includes('PriceScenarioField'));
  assert.ok(!active.includes('setPrice('));
  assert.ok(!active.includes('Qual preço final você quer simular?'));
});
test('previsão de subida e preço sem subida não são confundidos com lucro na opção', () => {
  const b3call = {...call,underlying:'B3SA3',strike:18.52,premium:1.90};
  const atStart = payoff(b3call,19);
  assert.equal(atStart.result,-142);
  assert.equal(scenarioMovement(19,19),'flat');
});


test('reconstituição histórica: todas as entradas são anteriores aos vencimentos de 2024/2025 e possuem fontes', () => {
  assert.equal(historicalReplays.length,5);
  assert.deepEqual([...new Set(historicalReplays.map(row=>row.entryDate.slice(0,4)))].sort(), ['2024','2025']);
  assert.equal(new Set(historicalReplays.map(row=>row.id)).size,historicalReplays.length);
  for(const row of historicalReplays){
    assert.ok(row.entryDate < row.expiry);
    assert.ok(row.expiry < '2026-11-16');
    assert.ok(row.spotEntry > 0 && row.spotExpiry > 0);
    assert.ok(row.cdiSourceUrl.startsWith('https://'));
    assert.ok(row.cdiBusinessDays > 0);
    assert.ok(Number.isFinite(historicalCDIRate(row)));
    for(const side of ['up','down'] as const){
      const q=row.options[side];
      assert.ok(q.premium > 0 && q.strike > 0);
      assert.ok(q.sourceUrl.startsWith('https://opcoes.net.br/'));
    }
  }
});

test('Petrobras outubro 2025: PUT ganha com queda observada, CALL perde com a mesma queda', () => {
  const row=historicalReplays.find(r=>r.id==='petro-out-2025')!;
  const opportunity=historicalOpportunity(row,200)!;
  const put=historicalOutcome(opportunity,'down',200);
  const call=historicalOutcome(opportunity,'up',200);
  assert.equal(row.spotEntry,30.23);
  assert.equal(row.spotExpiry,29.73);
  assert.equal(put.choice.original.ticker,'PETRV321');
  assert.equal(put.choice.used,192);
  assert.equal(put.choice.remaining,8);
  assert.equal(put.optionResult.value,288);
  assert.equal(put.accounting.optionNetResult,96);
  assert.equal(put.matchedDirection,true);
  assert.equal(put.accounting.hypotheticalSupplement,0);
  assert.equal(put.accounting.fixedIncomeNetResult,.02);
  assert.equal(put.accounting.simulatedTotal,296.02);
  assert.equal(call.choice.original.ticker,'PETRJ321');
  assert.equal(call.accounting.optionNetResult,-153);
  assert.equal(call.matchedDirection,false);
  assert.ok(call.accounting.hypotheticalSupplement > 0);
});

test('Itaú outubro 2025: CALL tem lucro teórico com alta observada', () => {
  const o=historicalOpportunity(historicalReplays.find(x=>x.id==='itau-out-2025')!,200)!;
  const result=historicalOutcome(o,'up',200);
  assert.equal(result.choice.original.ticker,'ITUBJ400');
  assert.equal(result.choice.used,162);
  assert.equal(result.choice.remaining,38);
  assert.equal(result.optionResult.value,176);
  assert.equal(result.accounting.optionNetResult,14);
  assert.equal(result.matchedDirection,true);
  assert.equal(result.accounting.hypotheticalSupplement,0);
  assert.equal(result.accounting.simulatedTotal,214.10);
});

test('Petrobras outubro 2024: a operação PUT também tem lucro com dado passado', () => {
  const o=historicalOpportunity(historicalReplays.find(x=>x.id==='petro-out-2024')!,200)!;
  const result=historicalOutcome(o,'down',200);
  assert.equal(result.choice.original.ticker,'PETRV419');
  assert.equal(result.choice.used,192);
  assert.equal(result.choice.remaining,8);
  assert.equal(result.optionResult.value,280);
  assert.equal(result.accounting.optionNetResult,88);
  assert.equal(result.accounting.simulatedTotal,288.01);
});

test('Vale e B3 também apresentam contratos históricos acessíveis para subida e queda', () => {
  for(const ticker of ['VALE3','B3SA3']){
    const available=availableHistoricalOpportunities(ticker,200);
    assert.equal(available.length,1);
    const up=historicalOutcome(available[0],'up',200);
    const down=historicalOutcome(available[0],'down',200);
    assert.equal(up.matchedDirection,true);
    assert.equal(down.matchedDirection,false);
    assert.ok(up.accounting.optionNetResult>0);
    assert.ok(down.accounting.optionNetResult<0);
  }
});

test('o histórico não depende da direção escolhida nem oferece resultados futuros sorteados', () => {
  const selected=historicalOpportunity(historicalReplays.find(x=>x.id==='petro-out-2025')!,200)!;
  assert.equal(historicalOutcome(selected,'up',200).stockMovement,
    historicalOutcome(selected,'down',200).stockMovement);
  assert.equal(selected.spotExpiry,29.73);
  const active=readFileSync(new URL('../PulseJourney.tsx', import.meta.url),'utf8');
  assert.ok(active.includes('historicalOutcome(chosen,direction,budget)'));
  assert.ok(active.includes('StockFactorsExplorer'));
  assert.ok(active.includes('readOnly protection='));
  assert.ok(!active.includes('generateAutomaticScenario'));
  assert.ok(!active.includes('PriceScenarioField'));
});
