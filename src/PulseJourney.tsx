import { useId, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ChevronRight, ShieldCheck } from 'lucide-react';
import stockData from './data/stocks.json';
import type { Stock } from './types/market';
import { breakEven } from './utils/optionsMath';
import { money, date } from './utils/format';
import {
  availableHistoricalOpportunities, historicalOption, historicalOutcome,
  asHistoricalStock, historicalDaysBetween, type HistoricalDirection
} from './utils/historicalReplay';
import { WhatIfChart } from './components/WhatIfChart';
import { StockFactorsExplorer } from './components/StockFactorsExplorer';
import './pulse.css';

const stocks = stockData as Stock[];
const round = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

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
  const [months, setMonths] = useState(1);
  const [historyId, setHistoryId] = useState('');
  const [direction, setDirection] = useState<HistoricalDirection>('up');

  const budget = Number(amount.replace(',', '.'));
  const validBudget = Number.isFinite(budget) && budget >= 1 && budget <= 1_000_000;
  const stock = stocks.find(item => item.ticker === ticker) || stocks[0];
  // The month selector is a maximum wait, not the exact expiry of the real option.
  const opportunities = useMemo(() => availableHistoricalOpportunities(stock.ticker,budget)
    .filter(item => item.days <= months * 31), [stock.ticker,budget,months]);
  const chosen = opportunities.find(item => item.id === historyId) || null;
  const outcome = chosen ? historicalOutcome(chosen,direction,budget) : null;
  const strategy = outcome?.choice ?? null;
  const optionResult = outcome?.optionResult ?? null;
  const accounting = outcome?.accounting ?? null;
  const usedProtection = accounting?.floorApplies ?? false;
  const totalWithFictionalFloor = accounting?.simulatedTotal ?? 0;
  const historicalStock = chosen ? asHistoricalStock(stock, chosen) : stock;
  const chosenPrice = chosen?.spotExpiry ?? 0;
  const days = chosen ? historicalDaysBetween(chosen.entryDate,chosen.expiry) : 0;
  const movement = chosen ? round((chosen.spotExpiry / chosen.spotEntry - 1) * 100) : 0;
  const chartOptions = chosen ? [historicalOption(chosen,direction)] : [];
  const changeTerms = () => setHistoryId('');
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
      <p className="data-stamp">Simulador acadêmico · cotações reais de referência · sem ordens de compra</p>
      <section className="screen" aria-label="XP Pulse — simulação">
        {step > 0 && <button className="simple-back" onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Voltar</button>}

        {step === 0 && <div className="pulse-welcome">
          <span className="pulse-symbol">↗</span>
          <h1>Sua próxima descoberta começa aqui.</h1>
          <p className="lead">Escolha uma empresa, faça sua previsão e descubra como seu investimento poderia se comportar.</p>
          <button className="xp-primary" onClick={() => setStep(1)}>Começar agora <ChevronRight size={18}/></button>
          <p className="disclaimer">Simulação acadêmica baseada em registros anteriores de mercado. Não envia ordens.</p>
        </div>}

        {step === 1 && <>
          <h1>Qual empresa você quer explorar?</h1>
          <p className="lead">Escolha uma empresa para simular.</p>
          <div className="stock-grid">{stocks.map(item => <button className="stock-card" key={item.ticker} onClick={() => { setTicker(item.ticker); setHistoryId(''); setStep(2); }}>
            <div><b>{item.name}</b><span>{item.ticker}</span></div><ChevronRight/>
          </button>)}</div>
        </>}

        {step === 2 && <>
          <div className="eyebrow">{stock.name} · {stock.ticker}</div>
          <h1>Vamos montar sua simulação.</h1>
          <p className="lead">Só precisamos saber quanto você quer investir e por quanto tempo pode esperar.</p>
          <label className="money-input"><span>Quanto você quer investir?</span><div>R$ <input aria-label="Valor da simulação" type="text" inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); changeTerms(); }}/></div></label>
          <div className="simple-presets">{[20,50,100,200].map(number => <button type="button" key={number} aria-pressed={budget===number} onClick={()=>{setAmount(String(number));changeTerms();}}>{money(number)}</button>)}</div>
          {!validBudget && <p className="field-error" role="alert">Escolha um valor entre R$ 1 e R$ 1.000.000.</p>}
          <h2>Por quanto tempo você pode esperar?</h2>
          <p>Escolha o tempo máximo. Buscaremos opções com vencimento dentro desse prazo.</p>
          <div className="pulse-term-grid">{[1,3,6].map(number=><button type="button" key={number} className={months===number?'active':''} aria-pressed={months===number} onClick={()=>{setMonths(number);changeTerms();}}>
            <strong>{number} {number===1?'mês':'meses'}</strong><small>{number===1?'Mais curto':number===3?'Intermediário':'Mais longo'}</small>
          </button>)}</div>
          <p className="disclaimer">O prazo selecionado é um limite máximo, não uma promessa de vencimento exatamente nessa data. Dados educacionais de referência.</p>
          <button className="xp-primary" disabled={!validBudget} onClick={()=>setStep(3)}>Encontrar oportunidades <ChevronRight size={18}/></button>
        </>}

        {step === 3 && <>
          <div className="eyebrow">{stock.name} · {money(budget)} · até {months} {months===1?'mês':'meses'}</div>
          <div className="pulse-heading-help">
            <h1>Suas oportunidades</h1>
            <HelpBubble title="Como escolhemos as opções?">Buscamos contratos de opções com preço registrado em negócios do mercado e prazos que cabem no seu limite. Usamos registros já encerrados para conseguir conferir o resultado sem sorteá-lo. O prêmio é o último valor negociado na data de referência, não uma oferta atual; a quantidade respeita limites didáticos de orçamento e volume. O restante vai para renda fixa simulada.</HelpBubble>
          </div>
          <p className="lead">Escolha uma alternativa para sua simulação.</p>
          {opportunities.length===0 ? <div className="pulse-panel">
            <h2>Nenhuma oportunidade nessa combinação</h2>
            <p>Não encontramos nessa amostra opções para subida e queda que caibam no valor escolhido. Ajuste seu orçamento.</p>
            <button className="xp-primary" onClick={()=>setStep(2)}>Alterar valor ou prazo</button>
          </div> : <div className="pulse-opportunities">{opportunities.map((item,index)=><button className="pulse-opportunity" key={item.id} type="button" onClick={()=>{setHistoryId(item.id);setStep(4);}}>
            <div className="pulse-opportunity-head"><strong>{index===0?'Primeira oportunidade':'Outra oportunidade disponível'}</strong><ChevronRight size={18}/></div>
            <span className="pulse-expiry">{item.days} {item.days===1?'dia':'dias'}</span>
            <small>Prazo até o vencimento · referência educacional</small>
            <div className="pulse-movements"><span><ArrowUpRight size={15}/> Subida · {item.rise.original.ticker}</span><span><ArrowDownRight size={15}/> Queda · {item.fall.original.ticker}</span></div>
          </button>)}</div>}
          <p className="disclaimer">As alternativas são exemplos com preços de negócios já registrados, não cotações ao vivo nem ofertas de compra.</p>
        </>}

        {step === 4 && (chosen && strategy ? <>
          <div className="eyebrow">{stock.name} · prazo de {days} dias</div>
          <h1>Você acha que a ação vai subir ou cair?</h1>
          <p className="lead">Explore os fatores que podem influenciar a ação e escolha o movimento que você acredita que vai acontecer. Depois, a plataforma mostrará o resultado do cenário de referência.</p>
          <StockFactorsExplorer key={stock.ticker} stock={stock}/>
          <h2 className="pulse-direction-heading">Qual é sua previsão?</h2>
          <div className="pulse-direction-grid">
            <button type="button" aria-pressed={direction === 'up'} className={direction === 'up' ? 'active' : ''} onClick={() => setDirection('up')}><ArrowUpRight size={30}/><strong>Subida</strong></button>
            <button type="button" aria-pressed={direction === 'down'} className={direction === 'down' ? 'active' : ''} onClick={() => setDirection('down')}><ArrowDownRight size={30}/><strong>Queda</strong></button>
          </div>
          <div className="pulse-panel">
            <h2>Sua simulação</h2>
            <dl className="pulse-facts">
              <div><dt>Valor inicial</dt><dd>{money(budget)}</dd></div>
              <div><dt>Prazo da opção</dt><dd>{days} dias até o vencimento</dd></div>
              <div><dt>Previsão</dt><dd>{direction === 'up' ? 'Subida (CALL)' : 'Queda (PUT)'}</dd></div>
            </dl>
            <details className="pulse-technical">
              <summary>Entender a opção e a renda fixa</summary>
              <dl className="pulse-facts">
                <div><dt>Série histórica</dt><dd>{strategy.original.ticker}</dd></div>
                <div><dt>Último prêmio negociado no pregão inicial</dt><dd>{money(strategy.original.premium)}</dd></div>
                <div><dt>Quantidade didática de opções</dt><dd>{strategy.position.contractSize.toLocaleString('pt-BR')}</dd></div>
                <div><dt>Usado em opções</dt><dd>{money(strategy.used)}</dd></div>
                <div><dt>Sobra destinada à renda fixa</dt><dd>{money(strategy.remaining)}</dd></div>
                <div><dt>Preço de exercício</dt><dd>{money(strategy.original.strike)}</dd></div>
                <div><dt>Ponto de equilíbrio teórico</dt><dd>{money(breakEven(strategy.original))}</dd></div>
              </dl>
              <p className="disclaimer">O preço reflete um negócio efetivamente registrado no mercado, mas a compra da posição simulada não foi executada. Custos, impostos, proventos, ajustes e preço oficial de liquidação não estão incluídos. <a href={strategy.original.sourceUrl} target="_blank" rel="noreferrer">Consultar histórico da opção</a>.</p>
            </details>
          </div>
          <div className="pulse-protection-note"><ShieldCheck size={18}/><span>A proposta acadêmica prevê um piso fictício de 100% de um CDI de referência, sem proteção financiada. A renda fixa simulada remunera apenas a sobra.</span></div>
          <button className="xp-primary" onClick={() => setStep(5)}>Simular minha estratégia <ChevronRight size={18}/></button>
        </> : <div className="pulse-panel"><p>Esse período não está disponível para o valor informado.</p><button className="xp-primary" onClick={() => setStep(3)}>Ver períodos</button></div>)}

        {step === 5 && (chosen && strategy && optionResult && accounting ? <>
          <div className="eyebrow">{stock.name} · {direction === 'up' ? 'Sua previsão: Subida' : 'Sua previsão: Queda'} · {date(chosen.expiry)}</div>
          <h1>Seu resultado</h1>
          <p className="lead">Quanto você teria ao final do cenário e como chegamos a esse valor.</p>
          <div className="pulse-scenario-summary">
            <strong>Preço da ação: {money(chosen.spotEntry)} → {money(chosen.spotExpiry)}</strong>
            <span>A ação variou {movement > 0 ? '+' : ''}{movement.toLocaleString('pt-BR')}% no cenário de referência. Sua previsão de {direction === 'up' ? 'subida' : 'queda'} {outcome?.matchedDirection ? 'acertou a direção' : 'não acertou a direção'}.</span>
            <span>{accounting.optionNetResult > 0 ? 'A opção apresentaria lucro.' : accounting.optionNetResult < 0 ? 'A opção apresentaria prejuízo.' : 'A opção ficou em equilíbrio.'} Acertar a direção não garante lucro na opção.</span>
          </div>
          <div className="pulse-result-card">
            <small>RESULTADO FINAL DA SIMULAÇÃO</small>
            <strong>{money(totalWithFictionalFloor)}</strong>
            <span>Investimento inicial: {money(budget)}. Resultado líquido total: {accounting.totalNetResult > 0 ? '+' : ''}{money(accounting.totalNetResult)}. Este valor inclui eventual complemento fictício do XP Pulse, ainda sem financiamento real.</span>
          </div>
          <div className="pulse-panel pulse-result-table">
            <h2>De onde veio esse resultado?</h2>
            <p className="pulse-info-intro">Esta conta mostra o que foi somado para chegar ao valor final.</p>
            <dl className="pulse-facts">
              <div><dt>Valor inicial investido</dt><dd>{money(budget)}</dd></div>
              <div><dt>Lucro ou prejuízo das opções <HelpBubble title="Lucro da opção">Calculamos o valor intrínseco teórico no vencimento menos o prêmio de referência por {strategy.position.contractSize.toLocaleString('pt-BR')} unidades. É uma conta ilustrativa antes de taxas, sem afirmar que a opção foi comprada ou exercida.</HelpBubble></dt><dd className={accounting.optionNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.optionNetResult > 0 ? '+' : ''}{money(accounting.optionNetResult)}</dd></div>
              <div><dt>Juros da renda fixa <HelpBubble title="Renda fixa">A sobra do orçamento recebe juros didáticos por {chosen.cdiBusinessDays} dias úteis, usando uma taxa diária histórica de referência constante ao longo do período. É uma aproximação, não o CDI acumulado exato.</HelpBubble></dt><dd>+{money(accounting.fixedIncomeNetResult)}</dd></div>
              <div><dt>Complemento fictício do CDI <HelpBubble title="Complemento não financiado">Este dinheiro adicional só existe na proposta acadêmica e seria necessário para garantir o piso. Não foi produzido necessariamente pela renda fixa e não existe atualmente uma fonte de financiamento definida.</HelpBubble></dt><dd>+{money(accounting.hypotheticalSupplement)}</dd></div>
              <div className="pulse-result-total-row"><dt>Resultado líquido total</dt><dd className={accounting.totalNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.totalNetResult > 0 ? '+' : ''}{money(accounting.totalNetResult)}</dd></div>
              <div className="pulse-result-total-row"><dt>Valor final hipotético</dt><dd>{money(totalWithFictionalFloor)}</dd></div>
            </dl>
            <div className="pulse-accounting-reference">
              <strong>Como foi dividido o valor inicial</strong>
              <dl className="pulse-facts">
                <div><dt>Compra teórica de {strategy.original.ticker}</dt><dd>{money(strategy.used)}</dd></div>
                <div><dt>Sobra na renda fixa</dt><dd>{money(strategy.remaining)}</dd></div>
                <div><dt>Rendimento de referência: 100% CDI histórico</dt><dd>+{money(accounting.hypotheticalFloorGain)}</dd></div>
              </dl>
              <p className="pulse-accounting-footnote">A referência de CDI não é somada duas vezes. É usada somente para comparar o valor econômico dos ativos com o piso acadêmico.</p>
            </div>
            {usedProtection && <p className="pulse-accounting-footnote">Neste episódio, a operação em opções e a renda fixa ficaram abaixo do piso fictício. A diferença mostrada como complemento não foi financiada por uma estrutura real.</p>}
          </div>
          <details className="pulse-panel pulse-result-details">
            <summary>Consultar preços, datas e cálculos da operação</summary>
            <dl className="pulse-facts">
              <div><dt>Data de referência da opção</dt><dd>{date(chosen.entryDate)}</dd></div>
              <div><dt>Preço inicial da ação</dt><dd>{money(chosen.spotEntry)}</dd></div>
              <div><dt>Preço final da ação no cenário</dt><dd>{money(chosen.spotExpiry)}</dd></div>
              <div><dt>Série da opção</dt><dd>{strategy.original.ticker}</dd></div>
              <div><dt>Prêmio histórico por unidade</dt><dd>{money(strategy.original.premium)}</dd></div>
              <div><dt>Preço de exercício</dt><dd>{money(strategy.original.strike)}</dd></div>
              <div><dt>Valor intrínseco teórico das opções</dt><dd>{money(optionResult.value)}</dd></div>
              <div><dt>CDI aproximado usado no período</dt><dd>{(chosen.cdiRate*100).toFixed(4).replace('.',',')}%</dd></div>
              <div><dt>Valor das opções + renda fixa antes do piso</dt><dd>{money(accounting.economicValueAtMaturity)}</dd></div>
              <div><dt>Piso acadêmico hipotético</dt><dd>{money(accounting.hypotheticalFloor)}</dd></div>
            </dl>
            <p className="disclaimer">Fonte: <a href={strategy.original.sourceUrl} target="_blank" rel="noreferrer">último negócio da opção e cotações da ação</a>; <a href={chosen.cdiSourceUrl} target="_blank" rel="noreferrer">CDI diário histórico</a>. O preço da ação no fechamento não é necessariamente o preço oficial de exercício. Não se trata de negociação real, backtest completo ou rendimento garantido.</p>
          </details>
          <button className="xp-primary" onClick={() => setStep(6)}>Explorar o gráfico <ChevronRight size={18}/></button>
          <button className="pulse-secondary" type="button" onClick={() => { setStep(1); setHistoryId(''); }}>Simular outra empresa</button>
        </> : <div className="pulse-panel"><p>Não foi possível calcular essa operação histórica.</p><button className="xp-primary" onClick={() => setStep(3)}>Alterar período</button></div>)}

        {step === 6 && (chosen && strategy && optionResult && accounting ? <>
          <div className="eyebrow">{stock.name} · {direction === 'up' ? 'Subida' : 'Queda'} · {date(chosen.expiry)}</div>
          <h1>Explore os cenários</h1>
          <p className="lead">Veja como o resultado mudaria com outros preços da ação. O ponto destacado é o cenário de referência e não pode ser alterado.</p>
          <div className="pulse-chart-figure">
            <span>Resultado das opções no cenário</span>
            <strong className={accounting.optionNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.optionNetResult > 0 ? '+' : ''}{money(accounting.optionNetResult)}</strong>
            <small>Preço da ação no cenário: {money(chosenPrice)}. Valor final do XP Pulse fictício: {money(totalWithFictionalFloor)}.</small>
          </div>
          <WhatIfChart stock={historicalStock} option={strategy.position} options={chartOptions} budget={budget} price={chosenPrice} onPrice={() => {}} onExpiry={() => {}} readOnly protection={{budget, cash: strategy.remaining, rate: chosen.cdiRate}}/>
          <p className="pulse-choice-note">Linha amarela: resultado das opções. Linha azul: resultado hipotético do XP Pulse, com eventual complemento ao piso CDI. Custos e impostos não estão incluídos.</p>
          <button className="xp-primary" onClick={() => setStep(5)}>Ver a tabela do resultado <ChevronRight size={18}/></button>
          <button className="pulse-secondary" type="button" onClick={() => { setStep(1); setHistoryId(''); }}>Simular outra empresa</button>
        </> : <div className="pulse-panel"><p>Não foi possível calcular essa operação histórica.</p><button className="xp-primary" onClick={() => setStep(3)}>Alterar período</button></div>)}
      </section>
    </div>
  </main>;
}
