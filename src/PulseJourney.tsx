import { useId, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ChevronRight, ShieldCheck } from 'lucide-react';
import stockData from './data/stocks.json';
import optionData from './data/options.json';
import metadata from './data/b3-metadata.json';
import type { Option, Stock } from './types/market';
import { validOption } from './utils/optionFilters';
import { payoff, breakEven } from './utils/optionsMath';
import { bestChoice, type Choice } from './utils/pulseSelection';
import { money, date } from './utils/format';
import { pulseAccounting } from './utils/pulseAccounting';
import { generateAutomaticScenario, scenarioMovement, scenarioChangePercent, type AutomaticScenario, ASSUMED_ANNUAL_VOLATILITY } from './utils/scenarioPrice';
import { WhatIfChart } from './components/WhatIfChart';
import { StockFactorsExplorer } from './components/StockFactorsExplorer';
import './pulse.css';

const stocks = stockData as Stock[];
const historicalOptions = (optionData as Option[]).filter(validOption);
const DEMO_CDI_MONTHLY_RATE = 0.012; // Fictitious 100%-CDI reference, not a current CDI quotation.
type Direction = 'up' | 'down';
type Opportunity = { expiry: string; days: number; rise: Choice; fall: Choice; distance: number };

function round(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function daysUntil(isoDate: string) {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(isoDate + 'T00:00:00Z') - start) / 86400000);
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
  const [scenario, setScenario] = useState<AutomaticScenario | null>(null);
  const budget = Number(amount.replace(',', '.'));
  const validBudget = Number.isFinite(budget) && budget >= 1 && budget <= 1000000;
  const stock = stocks.find(item => item.ticker === ticker) || stocks[0];
  const opportunities = useMemo(() => findOpportunities(stock, budget, months), [stock, budget, months]);
  const chosen = opportunities.find(item => item.expiry === expiry) || null;
  const strategy = chosen ? (direction === 'up' ? chosen.rise : chosen.fall) : null;
  // Future closing prices are unknown: an automatically drawn scenario does not depend on the user's prediction.
  const chosenPrice = scenario?.finalPrice ?? stock.price;
  const simulatedMovement = scenarioMovement(stock.price, chosenPrice);
  const directionMatchesScenario = simulatedMovement === direction;
  const simulatedPercent = scenarioChangePercent(stock.price, chosenPrice);
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
  const changeTerms = () => { setExpiry(''); setScenario(null); };
  const goResult = () => { if (!chosen) return; setScenario(generateAutomaticScenario(stock.price, chosen.days)); setStep(5); };
  const labels = ['Boas-vindas', 'Empresa', 'Valor e prazo', 'Oportunidades', 'Sua previsão', 'Resultado', 'Gráfico'];

  return <main className="pulse-v3">
    <div className="ambient"/>
    <div className="app-shell simple-journey">
      <header className="xp-header">
        <button className="logo logo-home" aria-label="XP Pulse — início" onClick={() => setStep(0)}><span>XP</span><b>PULSE</b></button>
        <span className="simple-count">{step === 0 ? 'Bem-vindo' : String(step) + ' de 6 · ' + labels[step]}</span>
      </header>
      <div className="simple-progress" aria-label={labels[step]}>{[1, 2, 3, 4, 5, 6].map(n => <i key={n} className={n <= step ? 'filled' : ''}/>)}</div>
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
          <div className="stock-grid">{stocks.map(item => <button className="stock-card" key={item.ticker} onClick={() => { setTicker(item.ticker); setExpiry(''); setScenario(null); setStep(2); }}>
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
          <div className="pulse-heading-help">
            <h1>Suas oportunidades</h1>
            <HelpBubble title="Como escolhemos as opções?">
              Primeiro, procuramos opções que precisem de uma subida ou queda menor para começar a gerar lucro, comparando o preço de equilíbrio com o preço histórico da ação. Depois, para a opção selecionada, compramos o máximo de unidades que cabe no seu orçamento. O que sobrar vai para a renda fixa. Isso não garante lucro nem prevê o movimento do mercado.
            </HelpBubble>
          </div>
          <p className="lead">Datas e contratos de opções que constam da base histórica da B3. Escolha o prazo que preferir.</p>
          {opportunities.length === 0 ? <div className="pulse-panel">
            <h2>Nenhuma oportunidade nessa combinação</h2>
            <p>A base histórica não contém, nesse valor e prazo, opções acessíveis para subida e queda. Você pode ajustar seu valor ou escolher outro prazo.</p>
            <button className="xp-primary" onClick={() => setStep(2)}>Alterar valor ou prazo</button>
          </div> : <div className="pulse-opportunities">{opportunities.map((item, index) => <button className="pulse-opportunity" type="button" key={item.expiry} onClick={() => { setExpiry(item.expiry); setScenario(null); setStep(4); }}>
            <div className="pulse-opportunity-head"><strong>{index === 0 ? 'Mais próxima do seu prazo' : 'Outra data disponível'}</strong><ChevronRight size={18}/></div>
            <span className="pulse-expiry">{date(item.expiry)}</span><small>{item.days} dias até o vencimento</small>
            <div className="pulse-movements"><span><ArrowUpRight size={15}/> Subida · {item.rise.original.ticker}</span><span><ArrowDownRight size={15}/> Queda · {item.fall.original.ticker}</span></div>
          </button>)}</div>}
          <p className="disclaimer">As séries foram negociadas no pregão de {date(metadata.tradeDate)} e podem não ter ofertas hoje. A seleção não é recomendação. <a href={metadata.sourceUrl} target="_blank" rel="noreferrer">Consultar arquivo histórico da B3</a>.</p>
        </>}

        {step === 4 && (chosen && strategy ? <>
          <div className="eyebrow">{stock.name} · até {date(chosen.expiry)}</div>
          <h1>Você acha que vai subir ou cair?</h1>
          <p className="lead">Conheça alguns fatores econômicos que podem influenciar essa ação antes de escolher a direção.</p>
          <StockFactorsExplorer key={stock.ticker} stock={stock}/>
          <h2 className="pulse-direction-heading">Agora, qual é a sua previsão?</h2>
          <p className="pulse-direction-description">Depois de explorar os fatores, escolha se você acredita que a ação vai subir ou cair.</p>
          <div className="pulse-direction-grid">
            <button type="button" aria-pressed={direction === 'up'} className={direction === 'up' ? 'active' : ''} onClick={() => { if (direction !== 'up') { setDirection('up'); setScenario(null); } }}><ArrowUpRight size={30}/><strong>Subida</strong></button>
            <button type="button" aria-pressed={direction === 'down'} className={direction === 'down' ? 'active' : ''} onClick={() => { if (direction !== 'down') { setDirection('down'); setScenario(null); } }}><ArrowDownRight size={30}/><strong>Queda</strong></button>
          </div>
          <div className="pulse-simulation-method">
            <strong>Como funciona a simulação?</strong>
            <p>Você faz a previsão de subida ou queda. Em seguida, o XP Pulse sorteia um movimento de mercado hipotético, <b>independente da sua escolha</b>. Assim, a direção pode se confirmar ou não, e a opção pode ter lucro ou prejuízo.</p>
            <p>O preço futuro ainda não é conhecido. Para ensinar como o risco funciona, usamos um modelo probabilístico ilustrativo, com volatilidade anual assumida de {(ASSUMED_ANNUAL_VOLATILITY * 100).toLocaleString('pt-BR')}% — não uma volatilidade medida ou uma previsão. O resultado é apenas uma possibilidade, não um retorno real.</p>
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
          <button className="xp-primary" onClick={goResult}>Simular um cenário de mercado <ChevronRight size={18}/></button>
        </> : <div className="pulse-panel"><p>Essa data não está mais disponível na seleção. Escolha outra oportunidade.</p><button className="xp-primary" onClick={() => setStep(3)}>Ver oportunidades</button></div>)}

        {step === 5 && (chosen && strategy && optionResult && accounting ? <>
          <div className="eyebrow">{stock.name} · {direction === 'up' ? 'Subida' : 'Queda'} · {date(chosen.expiry)}</div>
          <h1>Seu resultado</h1>
          <p className="lead">Um possível resultado gerado automaticamente pelo simulador, e como ele foi calculado. Não é uma cotação futura nem previsão.</p>
          <div className="pulse-scenario-summary">
            <strong>Cenário de mercado simulado: {money(stock.price)} → {money(chosenPrice)}</strong>
            <span>O modelo gerou {simulatedMovement === 'up' ? 'uma alta' : simulatedMovement === 'down' ? 'uma queda' : 'estabilidade'} de {Math.abs(simulatedPercent).toLocaleString('pt-BR')}%, independentemente da sua previsão. Nesse cenário fictício, sua previsão de {direction === 'up' ? 'subida' : 'queda'} {directionMatchesScenario ? 'coincidiu com o movimento simulado' : 'não se confirmou'}.</span>
            <span>{accounting.optionNetResult > 0 ? 'A opção teria lucro líquido nesse cenário.' : accounting.optionNetResult < 0 ? 'A opção teria prejuízo nesse cenário.' : 'A opção ficaria no ponto de equilíbrio.'} Mesmo acertar a direção não garante lucro.</span>
          </div>
          <div className="pulse-result-card">
            <small>RESULTADO FINAL DA SIMULAÇÃO</small>
            <strong>{money(totalWithFictionalFloor)}</strong>
            <span>Investimento inicial: {money(budget)}. Resultado líquido total: {accounting.totalNetResult > 0 ? '+' : ''}{money(accounting.totalNetResult)} (antes de taxas e impostos).</span>
          </div>
          <div className="pulse-panel pulse-result-table">
            <h2>De onde veio esse resultado?</h2>
            <p className="pulse-info-intro">Esta conta mostra o que foi somado para chegar ao valor final.</p>
            <dl className="pulse-facts">
              <div><dt>Valor inicial investido <HelpBubble title="Valor inicial">Valor total que você escolheu para a simulação. Ele foi dividido entre opções e a sobra destinada à renda fixa.</HelpBubble></dt><dd>{money(budget)}</dd></div>
              <div><dt>Lucro ou prejuízo das opções <HelpBubble title="Resultado líquido das opções">O valor bruto das opções no vencimento menos o custo para comprá-las: {money(optionResult.value)} menos {money(strategy.used)}. Um número negativo é perda apenas das opções, não do produto inteiro.</HelpBubble></dt><dd className={accounting.optionNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.optionNetResult > 0 ? '+' : ''}{money(accounting.optionNetResult)}</dd></div>
              <div><dt>Juros da renda fixa <HelpBubble title="Juros da renda fixa">Somente os juros ilustrativos sobre {money(strategy.remaining)}, que sobraram depois da compra das opções. O saldo investido na renda fixa não é somado outra vez porque já faz parte do investimento inicial.</HelpBubble></dt><dd>+{money(accounting.fixedIncomeNetResult)}</dd></div>
              <div><dt>Complemento hipotético do CDI <HelpBubble title="Complemento hipotético">Se as opções e a renda fixa não atingirem o mínimo fictício, calculamos quanto precisaria ser acrescentado para chegar ao piso. Este complemento ainda não tem financiamento nem garantia real.</HelpBubble></dt><dd>+{money(accounting.hypotheticalSupplement)}</dd></div>
              <div className="pulse-result-total-row"><dt>Resultado líquido total <HelpBubble title="Resultado líquido total">É a diferença entre o valor final da simulação e o investimento inicial. Também equivale a: lucro ou prejuízo das opções + juros da renda fixa + complemento hipotético. Antes de taxas e impostos.</HelpBubble></dt><dd className={accounting.totalNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.totalNetResult > 0 ? '+' : ''}{money(accounting.totalNetResult)}</dd></div>
              <div className="pulse-result-total-row"><dt>Valor final simulado</dt><dd>{money(totalWithFictionalFloor)}</dd></div>
            </dl>
            <div className="pulse-accounting-reference">
              <strong>Como o investimento foi dividido</strong>
              <dl className="pulse-facts">
                <div><dt>Usado para comprar opções</dt><dd>{money(strategy.used)}</dd></div>
                <div><dt>Destinado à renda fixa</dt><dd>{money(strategy.remaining)}</dd></div>
                <div><dt>Referência de 100% do CDI <HelpBubble title="CDI: referência, não soma">Este é o rendimento mínimo fictício calculado sobre todo o valor inicial, com taxa ilustrativa de 1,2% ao mês. É um parâmetro de comparação, não uma parcela adicional a somar aos resultados acima.</HelpBubble></dt><dd>+{money(accounting.hypotheticalFloorGain)}</dd></div>
              </dl>
              <p className="pulse-accounting-footnote">A referência de CDI não é somada à conta. Somente o complemento hipotético, quando necessário, entra no cálculo do valor final.</p>
            </div>
            <p className="pulse-accounting-footnote">{usedProtection ? 'Neste cenário, o valor gerado por opções e renda fixa ficou abaixo do piso hipotético. A parcela adicional necessária aparece separada e ainda não tem financiamento definido.' : 'Neste cenário, opções e renda fixa superaram o piso fictício, portanto não houve complemento de proteção.'}</p>
          </div>
          <details className="pulse-panel pulse-result-details">
            <summary>Consultar preços e cálculos da operação</summary>
            <dl className="pulse-facts">
              <div><dt>Preço inicial da ação (histórico) <HelpBubble title="Preço inicial">Preço da ação registrado em {date(stock.sourceDate)}. Não é uma cotação atual.</HelpBubble></dt><dd>{money(stock.price)}</dd></div>
              <div><dt>Preço final no cenário sorteado <HelpBubble title="Preço simulado">Preço hipotético gerado por um modelo aleatório, sem influência da previsão do usuário. Não é cotação real nem previsão de vencimento.</HelpBubble></dt><dd>{money(chosenPrice)}</dd></div>
              <div><dt>Valor bruto da opção no vencimento <HelpBubble title="Valor da opção">Valor que a opção teria no vencimento antes de descontar o custo de compra.</HelpBubble></dt><dd>{money(optionResult.value)}</dd></div>
              <div><dt>Saldo da renda fixa no vencimento <HelpBubble title="Saldo da renda fixa">O valor originalmente reservado na renda fixa somado ao seu rendimento ilustrativo. Pode ser zero.</HelpBubble></dt><dd>{money(accounting.fixedIncomeAtMaturity)}</dd></div>
              <div><dt>Valor total antes da proteção <HelpBubble title="Total antes da proteção">Valor bruto da opção somado ao saldo da renda fixa. É o que os dois investimentos produziriam antes da proteção imaginada.</HelpBubble></dt><dd>{money(accounting.economicValueAtMaturity)}</dd></div>
              <div><dt>Valor mínimo hipotético com CDI</dt><dd>{money(accounting.hypotheticalFloor)}</dd></div>
              <div><dt>Valor final fictício</dt><dd>{money(totalWithFictionalFloor)}</dd></div>
            </dl>
            <p className="disclaimer">O rendimento mínimo de 100% do CDI faz parte da proposta acadêmica e ainda não possui fonte de financiamento ou garantia contratual. Os dados das opções são históricos e os valores são antes de custos e impostos.</p>
          </details>
          <button className="xp-primary" onClick={() => setStep(6)}>Explorar o gráfico <ChevronRight size={18}/></button>
          <button className="pulse-secondary" type="button" onClick={() => { setStep(1); setExpiry(''); setScenario(null); }}>Simular outra empresa</button>
        </> : <div className="pulse-panel"><p>Não foi possível encontrar a estratégia escolhida nesta base.</p><button className="xp-primary" onClick={() => setStep(2)}>Alterar simulação</button></div>)}

        {step === 6 && (chosen && strategy && optionResult && accounting ? <>
          <div className="eyebrow">{stock.name} · {direction === 'up' ? 'Subida' : 'Queda'} · {date(chosen.expiry)}</div>
          <h1>Explore os cenários</h1>
          <p className="lead">Veja como o resultado das opções varia com o preço da ação. O ponto destacado corresponde ao cenário sorteado; o gráfico não altera seu resultado.</p>
          <div className="pulse-chart-figure">
            <span>Valor final do XP Pulse neste cenário fictício</span>
            <strong>{money(totalWithFictionalFloor)}</strong>
            <small>Resultado líquido total: {accounting.totalNetResult > 0 ? '+' : ''}{money(accounting.totalNetResult)}</small>
          </div>
          <WhatIfChart stock={stock} option={strategy.position} options={chartOptions} budget={budget} price={chosenPrice} onPrice={() => {}} onExpiry={() => {}} readOnly protection={{budget, cash: strategy.remaining, rate}}/>
          <p className="pulse-choice-note">Linha amarela: resultado da opção isolada. Linha azul: resultado hipotético do XP Pulse, incluindo eventual complemento para atingir o piso de 100% do CDI.</p>
          <button className="xp-primary" onClick={() => setStep(5)}>Ver a tabela do resultado <ChevronRight size={18}/></button>
          <button className="pulse-secondary" type="button" onClick={() => { setStep(1); setExpiry(''); setScenario(null); }}>Simular outra empresa</button>
        </> : <div className="pulse-panel"><p>Não foi possível encontrar a estratégia escolhida nesta base.</p><button className="xp-primary" onClick={() => setStep(2)}>Alterar simulação</button></div>)}
      </section>
    </div>
  </main>;
}
