import { useId, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ChevronRight, ShieldCheck } from 'lucide-react';
import stockData from './data/stocks.json';
import optionData from './data/options.json';
import metadata from './data/b3-metadata.json';
import type { Option, Stock } from './types/market';
import { validOption } from './utils/optionFilters';
import { optionCost, payoff, breakEven } from './utils/optionsMath';
import { money, date } from './utils/format';
import { pulseAccounting } from './utils/pulseAccounting';
import { WhatIfChart } from './components/WhatIfChart';
import './pulse.css';

const stocks = stockData as Stock[];
const historicalOptions = (optionData as Option[]).filter(validOption);
const DEMO_CDI_MONTHLY_RATE = 0.012; // Fictitious 100%-CDI reference, not a current CDI quotation.
type Direction = 'up' | 'down';
type Choice = { original: Option; position: Option; lots: number; used: number; remaining: number };
type Opportunity = { expiry: string; days: number; rise: Choice; fall: Choice; distance: number };

function round(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function daysUntil(isoDate: string) {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(isoDate + 'T00:00:00Z') - start) / 86400000);
}
function bestChoice(series: Option[], budget: number, stockPrice: number): Choice | null {
  const candidates = series.map(original => {
    const lotCost = optionCost(original);
    if (lotCost <= 0 || lotCost > budget) return null;
    const lots = Math.floor((budget + 0.0000001) / lotCost);
    if (lots < 1) return null;
    const used = round(lotCost * lots);
    if (used > budget) return null;
    return { original, position: { ...original, contractSize: original.contractSize * lots }, lots, used, remaining: round(budget - used) };
  }).filter((candidate): candidate is Choice => candidate !== null);
  candidates.sort((a, b) => a.remaining - b.remaining
    || Math.abs(a.original.strike - stockPrice) - Math.abs(b.original.strike - stockPrice)
    || (b.original.trades || 0) - (a.original.trades || 0)
    || a.original.ticker.localeCompare(b.original.ticker));
  return candidates[0] || null;
}
function findOpportunities(stock: Stock, budget: number, months: number): Opportunity[] {
  if (!Number.isFinite(budget) || budget < 1 || budget > 1000000) return [];
  const all = historicalOptions.filter(option => option.underlying === stock.ticker && daysUntil(option.expiry) > 0);
  const expiries = [...new Set(all.map(option => option.expiry))];
  const targetDays = months * 30.44;
  const tolerance = Math.max(40, months * 15);
  return expiries.map(expiry => {
    const days = daysUntil(expiry);
    if (Math.abs(days - targetDays) > tolerance) return null;
    const sameDate = all.filter(option => option.expiry === expiry);
    const rise = bestChoice(sameDate.filter(option => option.type === 'CALL'), budget, stock.price);
    const fall = bestChoice(sameDate.filter(option => option.type === 'PUT'), budget, stock.price);
    // Never offer a date that has only one eligible movement.
    if (!rise || !fall) return null;
    return { expiry, days, rise, fall, distance: Math.abs(days - targetDays) };
  }).filter((item): item is Opportunity => item !== null)
    .sort((a, b) => a.distance - b.distance
      || (a.rise.remaining + a.fall.remaining) - (b.rise.remaining + b.fall.remaining))
    .slice(0, 4);
}
function simulatedRate(days: number) { return Math.pow(1 + DEMO_CDI_MONTHLY_RATE, days / 30) - 1; }

function HelpBubble({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className="pulse-hint">
    <button className="pulse-hint-button" type="button" aria-label={'Entenda: ' + title} aria-controls={id} aria-expanded={open} onClick={() => setOpen(previous => !previous)}>?</button>
    {open && <span className="pulse-hint-bubble" role="note" id={id}><strong>{title}</strong><span>{children}</span></span>}
  </span>;
}

export default function PulseJourney() {
  const [step, setStep] = useState(0);
  const [ticker, setTicker] = useState('PETR4');
  const [amount, setAmount] = useState('100');
  const [months, setMonths] = useState(3);
  const [expiry, setExpiry] = useState('');
  const [direction, setDirection] = useState<Direction>('up');
  const [price, setPrice] = useState<number | null>(null);
  const budget = Number(amount.replace(',', '.'));
  const validBudget = Number.isFinite(budget) && budget >= 1 && budget <= 1000000;
  const stock = stocks.find(item => item.ticker === ticker) || stocks[0];
  const opportunities = useMemo(() => findOpportunities(stock, budget, months), [stock, budget, months]);
  const chosen = opportunities.find(item => item.expiry === expiry) || null;
  const strategy = chosen ? (direction === 'up' ? chosen.rise : chosen.fall) : null;
  const chosenPrice = price === null ? stock.price : price;
  const rate = chosen ? simulatedRate(chosen.days) : 0;
  const optionResult = strategy ? payoff(strategy.position, chosenPrice) : null;
  // Assets and a hypothetical unfunded issuer supplement are distinct.
  // This preserves the academic proposal; it does not implement a real CDI guarantee.
  const accounting = strategy && optionResult ? pulseAccounting({
    principal: budget,
    optionAmount: strategy.used,
    optionValueAtMaturity: optionResult.value,
    fixedIncomeAmount: strategy.remaining,
    simulatedRate: rate,
  }) : null;
  const usedProtection = accounting?.floorApplies ?? false;
  const totalWithFictionalFloor = accounting?.simulatedTotal ?? 0;
  const chartOptions = chosen ? historicalOptions.filter(item => item.underlying === stock.ticker && item.expiry === chosen.expiry && item.type === strategy?.original.type) : [];
  const changeTerms = () => { setExpiry(''); setPrice(null); };
  const goResult = () => { setPrice(stock.price); setStep(5); };
  const labels = ['Boas-vindas', 'Empresa', 'Valor e prazo', 'Oportunidades', 'Sua previsão', 'Resultado'];

  return <main className="pulse-v3">
    <div className="ambient"/>
    <div className="app-shell simple-journey">
      <header className="xp-header">
        <button className="logo logo-home" aria-label="XP Pulse — início" onClick={() => setStep(0)}><span>XP</span><b>PULSE</b></button>
        <span className="simple-count">{step === 0 ? 'Bem-vindo' : String(step) + ' de 5 · ' + labels[step]}</span>
      </header>
      <div className="simple-progress" aria-label={labels[step]}>{[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= step ? 'filled' : ''}/>)}</div>
      <div className="simulation-banner">Protótipo acadêmico · nenhum dinheiro real</div>
      <p className="data-stamp">Séries históricas B3 · pregão {date(metadata.tradeDate)} · preços não são cotações ao vivo</p>
      <section className="screen" aria-label="XP Pulse — simulação">
        {step > 0 && <button className="simple-back" onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Voltar</button>}

        {step === 0 && <div className="pulse-welcome">
          <span className="pulse-symbol">↗</span>
          <h1>Sua próxima descoberta começa aqui.</h1>
          <p className="lead">Escolha uma empresa, faça sua previsão e veja como seu investimento poderia se comportar.</p>
          <button className="xp-primary" onClick={() => setStep(1)}>Começar agora <ChevronRight size={18}/></button>
          <p className="disclaimer">Simulação educativa de um produto financeiro fictício. Não envia ordens.</p>
        </div>}

        {step === 1 && <>
          <h1>Qual empresa você quer explorar?</h1>
          <p className="lead">Escolha uma empresa para simular.</p>
          <div className="stock-grid">{stocks.map(item => <button className="stock-card" key={item.ticker} onClick={() => { setTicker(item.ticker); setExpiry(''); setPrice(null); setStep(2); }}>
            <div><b>{item.name}</b><span>{item.ticker}</span></div><ChevronRight/>
          </button>)}</div>
        </>}

        {step === 2 && <>
          <div className="eyebrow">{stock.name} · {stock.ticker}</div>
          <h1>Vamos montar sua simulação.</h1>
          <p className="lead">Só precisamos saber quanto você quer investir e por quanto tempo.</p>
          <label className="money-input"><span>Quanto você quer investir?</span><div>R$ <input aria-label="Valor da simulação" type="text" inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); changeTerms(); }}/></div></label>
          <div className="simple-presets">{[20, 50, 100, 200].map(number => <button type="button" key={number} aria-pressed={budget === number} onClick={() => { setAmount(String(number)); changeTerms(); }}>{money(number)}</button>)}</div>
          {!validBudget && <p className="field-error" role="alert">Escolha um valor entre R$ 1 e R$ 1.000.000.</p>}
          <h2>Por quanto tempo você pode esperar?</h2>
          <p>Você escolhe um prazo aproximado. Nós buscamos datas reais de vencimento próximas dele.</p>
          <div className="pulse-term-grid">{[1, 3, 6].map(number => <button type="button" className={months === number ? 'active' : ''} aria-pressed={months === number} key={number} onClick={() => { setMonths(number); changeTerms(); }}>
            <strong>{number} {number === 1 ? 'mês' : 'meses'}</strong><small>{number === 1 ? 'Mais curto' : number === 3 ? 'Intermediário' : 'Mais longo'}</small>
          </button>)}</div>
          <p className="disclaimer">Só exibiremos vencimentos com alternativas de subida e queda compatíveis com o valor escolhido.</p>
          <button className="xp-primary" disabled={!validBudget} onClick={() => setStep(3)}>Encontrar oportunidades <ChevronRight size={18}/></button>
        </>}

        {step === 3 && <>
          <div className="eyebrow">{stock.name} · {money(budget)} · cerca de {months} {months === 1 ? 'mês' : 'meses'}</div>
          <h1>Suas oportunidades</h1>
          <p className="lead">Datas e contratos de opções que constam da base histórica da B3. Escolha o prazo que preferir.</p>
          {opportunities.length === 0 ? <div className="pulse-panel">
            <h2>Nenhuma oportunidade nessa combinação</h2>
            <p>A base histórica não contém, nesse valor e prazo, opções para os dois movimentos. Você pode ajustar seu valor ou escolher outro prazo.</p>
            <button className="xp-primary" onClick={() => setStep(2)}>Alterar valor ou prazo</button>
          </div> : <div className="pulse-opportunities">{opportunities.map((item, index) => <button className="pulse-opportunity" type="button" key={item.expiry} onClick={() => { setExpiry(item.expiry); setPrice(null); setStep(4); }}>
            <div className="pulse-opportunity-head"><strong>{index === 0 ? 'Mais próxima do seu prazo' : 'Outra data disponível'}</strong><ChevronRight size={18}/></div>
            <span className="pulse-expiry">{date(item.expiry)}</span><small>{item.days} dias até o vencimento</small>
            <div className="pulse-movements"><span><ArrowUpRight size={15}/> Subida · {item.rise.original.ticker}</span><span><ArrowDownRight size={15}/> Queda · {item.fall.original.ticker}</span></div>
          </button>)}</div>}
          <p className="disclaimer">As séries foram negociadas no pregão de {date(metadata.tradeDate)} e podem não ter ofertas hoje. A seleção não é recomendação. <a href={metadata.sourceUrl} target="_blank" rel="noreferrer">Consultar arquivo histórico da B3</a>.</p>
        </>}

        {step === 4 && (chosen && strategy ? <>
          <div className="eyebrow">{stock.name} · até {date(chosen.expiry)}</div>
          <h1>Você acha que vai subir ou cair?</h1>
          <p className="lead">Escolha o movimento que você acredita que vai acontecer até o prazo selecionado.</p>
          <div className="pulse-direction-grid">
            <button type="button" aria-pressed={direction === 'up'} className={direction === 'up' ? 'active' : ''} onClick={() => setDirection('up')}><ArrowUpRight size={30}/><strong>Subida</strong></button>
            <button type="button" aria-pressed={direction === 'down'} className={direction === 'down' ? 'active' : ''} onClick={() => setDirection('down')}><ArrowDownRight size={30}/><strong>Queda</strong></button>
          </div>
          <div className="pulse-panel">
            <h2>Sua simulação</h2>
            <dl className="pulse-facts">
              <div><dt>Quanto você escolheu</dt><dd>{money(budget)}</dd></div>
              <div><dt>Prazo</dt><dd>{date(chosen.expiry)}</dd></div>
              <div><dt>Estratégia</dt><dd>{direction === 'up' ? 'Subida' : 'Queda'}</dd></div>
            </dl>
            <details className="pulse-technical">
              <summary>Entender meu investimento</summary>
              <dl className="pulse-facts">
                <div><dt>Série real B3</dt><dd>{strategy.original.ticker}</dd></div>
                <div><dt>Preço histórico por unidade</dt><dd>{money(strategy.original.premium / strategy.original.quoteFactor)}</dd></div>
                <div><dt>Unidades simuladas</dt><dd>{strategy.position.contractSize.toLocaleString('pt-BR')}</dd></div>
                <div><dt>Destinado às opções</dt><dd>{money(strategy.used)}</dd></div>
                <div><dt>Destinado à renda fixa</dt><dd>{money(strategy.remaining)}</dd></div>
                <div><dt>Preço de exercício</dt><dd>{money(strategy.original.strike)}</dd></div>
              </dl>
              <p className="disclaimer">A simulação compra a maior quantidade possível da série escolhida, em blocos didáticos da base. Esses blocos não são uma confirmação do lote mínimo oficial. Último negócio em {date(strategy.original.sourceDate)}; não é oferta executável. <a href={strategy.original.sourceUrl} target="_blank" rel="noreferrer">Fonte B3</a>.</p>
            </details>
          </div>
          <div className="pulse-protection-note"><ShieldCheck size={18}/><span>Regra fictícia do projeto: se a estratégia não superar o rendimento de referência, o resultado mínimo simulado será 100% de um CDI hipotético no período.</span></div>
          <button className="xp-primary" onClick={goResult}>Simular minha estratégia <ChevronRight size={18}/></button>
        </> : <div className="pulse-panel"><p>Essa data não está mais disponível na seleção. Escolha outra oportunidade.</p><button className="xp-primary" onClick={() => setStep(3)}>Ver oportunidades</button></div>)}

        {step === 5 && (chosen && strategy && optionResult ? <>
          <div className="eyebrow">{stock.name} · {direction === 'up' ? 'Subida' : 'Queda'} · {date(chosen.expiry)}</div>
          <h1>Seu resultado simulado</h1>
          <p className="lead">Altere o preço da ação no gráfico para experimentar outros resultados.</p>
          <div className="pulse-result-card">
            <small>SEU VALOR FINAL NA SIMULAÇÃO</small>
            <strong>{money(totalWithFictionalFloor)}</strong>
            <span>Você começou com {money(budget)} e teria {money(round(totalWithFictionalFloor - budget))} de rendimento neste cenário fictício.</span>
          </div>
          <div className="pulse-choice-comparison" aria-label="Comparação do resultado da opção com o CDI hipotético">
            <div className={`pulse-choice-card ${!usedProtection ? 'is-selected' : ''}`}>
              <span className="pulse-choice-title">Quanto a opção rendeu? <HelpBubble title="Resultado da opção">Este é o lucro ou prejuízo da opção isolada, descontando quanto custou comprá-la. Se não houve lucro, mostramos “Sem lucro”; o valor exato da perda está em “Entender a conta”.</HelpBubble></span>
              <strong>{accounting && accounting.optionNetResult > 0 ? '+' + money(accounting.optionNetResult) : 'Sem lucro'}</strong>
              <small>{accounting && accounting.optionNetResult > 0 ? 'Ganho com sua previsão, antes de taxas e impostos.' : 'A opção não compensou neste cenário.'}</small>
              {!usedProtection && <span className="pulse-choice-tag">Resultado da estratégia aplicado</span>}
            </div>
            <div className={`pulse-choice-card ${usedProtection ? 'is-selected' : ''}`}>
              <span className="pulse-choice-title">Quanto renderia a 100% do CDI? <HelpBubble title="CDI na simulação">É quanto todo o valor inicial renderia na hipótese de 100% do CDI. Usamos uma taxa ilustrativa de 1,2% ao mês, não a taxa real de hoje. Esse valor NÃO foi necessariamente produzido pela parte aplicada em renda fixa; a proteção ainda não tem financiamento.</HelpBubble></span>
              <strong>+{money(accounting?.hypotheticalFloorGain ?? 0)}</strong>
              <small>Referência fictícia para o período escolhido.</small>
              {usedProtection && <span className="pulse-choice-tag">Rendimento mínimo aplicado nesta simulação</span>}
            </div>
          </div>
          <p className="pulse-choice-note">{usedProtection
            ? 'Neste cenário, a opção não superou o rendimento mínimo imaginado para o XP Pulse. Por isso, usamos o resultado hipotético de 100% do CDI.'
            : 'Neste cenário, a estratégia superou a referência de 100% do CDI. O total também considera qualquer pequena sobra aplicada à renda fixa.'}</p>
          <WhatIfChart stock={stock} option={strategy.position} options={chartOptions} budget={budget} price={chosenPrice} onPrice={setPrice} onExpiry={() => {}} protection={{budget, cash: strategy.remaining, rate}}/>
          <details className="pulse-panel pulse-result-details">
            <summary>Entender a conta e os preços</summary>
            <p className="pulse-info-intro">Toque nos pontos de interrogação para entender cada número.</p>
            <dl className="pulse-facts">
              <div><dt>Preço inicial da ação <HelpBubble title="Preço inicial da ação">Preço histórico da {stock.name} registrado em {date(stock.sourceDate)}. É o ponto de partida da simulação; não é a cotação de hoje.</HelpBubble></dt><dd>{money(stock.price)}</dd></div>
              <div><dt>Preço final hipotético <HelpBubble title="Preço final hipotético">Preço que você imagina que a ação terá no vencimento. Você pode alterá-lo no gráfico. Não é previsão nem preço real do futuro.</HelpBubble></dt><dd>{money(chosenPrice)}</dd></div>
              <div><dt>Resultado somente da opção <HelpBubble title="Resultado da opção">Quanto a posição em opções ganharia ou perderia, já descontado o custo de compra. É o resultado da opção isolada, não o total que o XP Pulse fictício apresenta.</HelpBubble></dt><dd>{money(accounting?.optionNetResult ?? 0)}</dd></div>
              <div><dt>Renda fixa no vencimento <HelpBubble title="Renda fixa">Apenas o valor que sobrou após a compra de opções é aplicado aqui, com rendimento hipotético. Se estiver zerado, todo o orçamento foi usado nas opções. Isso não significa que a renda fixa criou o ganho do CDI.</HelpBubble></dt><dd>{money(accounting?.fixedIncomeAtMaturity ?? 0)}</dd></div>
              <div><dt>Valor antes da proteção <HelpBubble title="Valor antes da proteção">Somamos o valor que a opção teria no vencimento com o valor da parcela de renda fixa. Esse é o resultado econômico simulado, sem nenhuma ajuda externa.</HelpBubble></dt><dd>{money(accounting?.economicValueAtMaturity ?? 0)}</dd></div>
              <div><dt>Complemento fictício da proteção <HelpBubble title="Complemento fictício">É quanto faltaria para alcançar o rendimento mínimo prometido na hipótese acadêmica. Não é dinheiro gerado pela renda fixa: alguém precisaria financiar esse valor para a proteção existir de verdade.</HelpBubble></dt><dd>{money(accounting?.hypotheticalSupplement ?? 0)}</dd></div>
              <div><dt>Piso hipotético de 100% do CDI <HelpBubble title="Piso hipotético de 100% do CDI">É o investimento inicial acrescido de uma taxa ilustrativa de 1,2% ao mês durante {chosen.days} dias. Não usamos a taxa CDI de mercado. Essa remuneração é uma hipótese do projeto, sem garantia real.</HelpBubble></dt><dd>{money(accounting?.hypotheticalFloor ?? 0)}</dd></div>
            </dl>
            <p className="pulse-accounting-footnote">O valor final simulado é a soma do valor antes da proteção com o complemento fictício, quando necessário. A viabilidade dessa proteção ainda precisa ser estudada.</p>
          </details>

          <div className="pulse-protection-note"><ShieldCheck size={18}/><span>O gráfico preservado mostra a opção isolada e o resultado acadêmico com piso fictício. O complemento necessário para alcançar esse piso não está financiado. No mercado real, a compra de opções pode perder todo o prêmio.</span></div>
          <details className="pulse-technical"><summary>Como chegamos ao resultado?</summary>
            <p>A simulação compra {strategy.position.contractSize.toLocaleString('pt-BR')} unidades históricas da série {strategy.original.ticker}, por {money(strategy.used)}. O restante, {money(strategy.remaining)}, vai para renda fixa.</p>
            <p>O valor bruto da opção no vencimento seria {money(optionResult.value)}. Somado à renda fixa de {money(accounting?.fixedIncomeAtMaturity ?? 0)}, resultaria em {money(accounting?.economicValueAtMaturity ?? 0)} antes da proteção.</p>
            <p>Com o piso hipotético de {money(accounting?.hypotheticalFloor ?? 0)} em {chosen.days} dias, faltaria um complemento fictício de {money(accounting?.hypotheticalSupplement ?? 0)}. O total do cenário é {money(totalWithFictionalFloor)}.</p>
            <p>A direção da ação, sozinha, não garante lucro na opção: é necessário ultrapassar o ponto de equilíbrio de {money(breakEven(strategy.original))} no vencimento.</p>
            <p className="disclaimer">Essa garantia não foi financiada nem validada; o XP Pulse não representa uma operação real, promessa de rentabilidade ou produto aprovado pela XP ou CVM. Os cálculos são antes de custos e impostos.</p>
          </details>
          <button className="xp-primary" onClick={() => { setStep(1); setExpiry(''); setPrice(null); }}>Simular outra empresa</button>
        </> : <div className="pulse-panel"><p>Não foi possível encontrar a estratégia escolhida nesta base.</p><button className="xp-primary" onClick={() => setStep(2)}>Alterar simulação</button></div>)}
      </section>
    </div>
  </main>;
}
