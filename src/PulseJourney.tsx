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
  const [amount, setAmount] = useState('200');
  const [historyId, setHistoryId] = useState('');
  const [direction, setDirection] = useState<HistoricalDirection>('up');

  const budget = Number(amount.replace(',', '.'));
  const validBudget = Number.isFinite(budget) && budget >= 1 && budget <= 1_000_000;
  const stock = stocks.find(item => item.ticker === ticker) || stocks[0];
  const opportunities = useMemo(() => availableHistoricalOpportunities(stock.ticker,budget), [stock.ticker,budget]);
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
  const labels = ['Boas-vindas', 'Empresa', 'Valor', 'Período histórico', 'Sua previsão', 'Resultado', 'Gráfico'];

  return <main className="pulse-v3">
    <div className="ambient"/>
    <div className="app-shell simple-journey">
      <header className="xp-header">
        <button className="logo logo-home" aria-label="XP Pulse — início" onClick={() => setStep(0)}><span>XP</span><b>PULSE</b></button>
        <span className="simple-count">{step === 0 ? 'Bem-vindo' : String(step) + ' de 6 · ' + labels[step]}</span>
      </header>
      <div className="simple-progress" aria-label={labels[step]}>{[1, 2, 3, 4, 5, 6].map(n => <i key={n} className={n <= step ? 'filled' : ''}/>)}</div>
      <div className="simulation-banner">Protótipo acadêmico · nenhum dinheiro real</div>
      <p className="data-stamp">Reconstituições históricas de 2024 e 2025 · opções e preços passados · nenhuma operação real</p>
      <section className="screen" aria-label="XP Pulse — simulação">
        {step > 0 && <button className="simple-back" onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Voltar</button>}

        {step === 0 && <div className="pulse-welcome">
          <span className="pulse-symbol">↗</span>
          <h1>Sua próxima descoberta começa aqui.</h1>
          <p className="lead">Escolha uma empresa, faça sua previsão e descubra como a ação realmente se movimentou em um período passado.</p>
          <button className="xp-primary" onClick={() => setStep(1)}>Começar agora <ChevronRight size={18}/></button>
          <p className="disclaimer">Reconstituição educativa com cotações históricas. Não envia ordens nem comprova operações executadas.</p>
        </div>}

        {step === 1 && <>
          <h1>Qual empresa você quer explorar?</h1>
          <p className="lead">Escolha uma empresa para explorar um episódio verificado de 2024 ou 2025.</p>
          <div className="stock-grid">{stocks.map(item => <button className="stock-card" key={item.ticker} onClick={() => { setTicker(item.ticker); setHistoryId(''); setStep(2); }}>
            <div><b>{item.name}</b><span>{item.ticker}</span></div><ChevronRight/>
          </button>)}</div>
        </>}

        {step === 2 && <>
          <div className="eyebrow">{stock.name} · {stock.ticker}</div>
          <h1>Quanto você investiria?</h1>
          <p className="lead">Imagine que você está investindo em uma data de 2024 ou 2025. Na próxima tela, você escolhe um período que já terminou.</p>
          <label className="money-input"><span>Valor inicial do exemplo</span><div>R$ <input aria-label="Valor da simulação" type="text" inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); changeTerms(); }}/></div></label>
          <div className="simple-presets">{[20,50,100,200].map(number=><button type="button" key={number} aria-pressed={budget===number} onClick={()=>{setAmount(String(number));changeTerms();}}>{money(number)}</button>)}</div>
          {!validBudget && <p className="field-error" role="alert">Escolha um valor entre R$ 1 e R$ 1.000.000.</p>}
          <p className="disclaimer">Usamos o último preço registrado das opções no pregão inicial e o fechamento histórico da ação no vencimento. Os contratos desta amostra vencem em poucos dias, não em 1, 3 ou 6 meses.</p>
          <button className="xp-primary" disabled={!validBudget} onClick={() => setStep(3)}>Explorar períodos históricos <ChevronRight size={18}/></button>
        </>}

        {step === 3 && <>
          <div className="eyebrow">{stock.name} · {money(budget)} · arquivo de 2024–2025</div>
          <div className="pulse-heading-help">
            <h1>Escolha um período histórico</h1>
            <HelpBubble title="Como escolhemos os contratos?">Usamos recortes com cotações verificáveis de ações e opções que foram negociadas antes do vencimento. A seleção da amostra foi feita para aprendizado; não representa todas as opções disponíveis na época nem comprova que uma compra teria sido executada. A quantidade de blocos didáticos de 100 unidades respeita o orçamento e um limite conservador baseado no volume financeiro negociado na data. O restante do dinheiro fica numa renda fixa simulada atrelada ao CDI histórico. Isso não comprova que as opções poderiam ter sido compradas por aquele preço.</HelpBubble>
          </div>
          <p className="lead">Escolha um episódio do passado. O resultado do movimento da ação será revelado somente depois da sua previsão.</p>
          {opportunities.length === 0 ? <div className="pulse-panel">
            <h2>Nenhum período acessível por esse valor</h2>
            <p>Para {stock.name}, os contratos desta pequena amostra podem custar mais que o valor informado. Aumente o orçamento para ver oportunidades históricas.</p>
            <button className="xp-primary" onClick={() => setStep(2)}>Alterar valor</button>
          </div> : <div className="pulse-opportunities">{opportunities.map(item => <button className="pulse-opportunity" type="button" key={item.id} onClick={() => { setHistoryId(item.id); setStep(4); }}>
            <div className="pulse-opportunity-head"><strong>{item.label}</strong><ChevronRight size={18}/></div>
            <span className="pulse-expiry">{date(item.entryDate)} → {date(item.expiry)}</span>
            <small>{item.days} dias corridos entre a compra teórica e o vencimento</small>
            <div className="pulse-movements"><span><ArrowUpRight size={15}/> Subida · {item.rise.original.ticker}</span><span><ArrowDownRight size={15}/> Queda · {item.fall.original.ticker}</span></div>
          </button>)}</div>}
          <p className="disclaimer">As cotações históricas não são ofertas atuais. Os blocos de 100 são didáticos e não representam garantia de liquidez ou lote mínimo oficial.</p>
        </>}

        {step === 4 && (chosen && strategy ? <>
          <div className="eyebrow">{stock.name} · estamos em {date(chosen.entryDate)}</div>
          <h1>Você acha que a ação vai subir ou cair?</h1>
          <p className="lead">Imagine que você só conhece os dados até {date(chosen.entryDate)}. O vencimento será em {date(chosen.expiry)}. Explore os fatores econômicos e faça sua previsão antes de descobrir o que aconteceu.</p>
          <StockFactorsExplorer key={stock.ticker} stock={stock}/>
          <h2 className="pulse-direction-heading">Qual é sua previsão?</h2>
          <div className="pulse-direction-grid">
            <button type="button" aria-pressed={direction === 'up'} className={direction === 'up' ? 'active' : ''} onClick={() => setDirection('up')}><ArrowUpRight size={30}/><strong>Subida</strong></button>
            <button type="button" aria-pressed={direction === 'down'} className={direction === 'down' ? 'active' : ''} onClick={() => setDirection('down')}><ArrowDownRight size={30}/><strong>Queda</strong></button>
          </div>
          <div className="pulse-panel">
            <h2>Seu investimento hipotético</h2>
            <dl className="pulse-facts">
              <div><dt>Valor inicial</dt><dd>{money(budget)}</dd></div>
              <div><dt>Data inicial</dt><dd>{date(chosen.entryDate)}</dd></div>
              <div><dt>Vencimento</dt><dd>{date(chosen.expiry)}</dd></div>
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
              </dl>
              <p className="disclaimer">O último negócio registrado e o volume histórico não garantem a possibilidade de comprar todas essas unidades por esse preço. Não são consideradas corretagem, impostos, proventos, ajustes ou o preço oficial de liquidação. <a href={strategy.original.sourceUrl} target="_blank" rel="noreferrer">Consultar histórico da opção</a>.</p>
            </details>
          </div>
          <div className="pulse-protection-note"><ShieldCheck size={18}/><span>A proposta acadêmica prevê um piso hipotético de 100% do CDI histórico, mas não possui estrutura de proteção financiada. A parcela em renda fixa recebe os juros históricos apenas sobre a sobra.</span></div>
          <button className="xp-primary" onClick={() => setStep(5)}>Descobrir o que aconteceu <ChevronRight size={18}/></button>
        </> : <div className="pulse-panel"><p>Esse período não está disponível para o valor informado.</p><button className="xp-primary" onClick={() => setStep(3)}>Ver períodos</button></div>)}

        {step === 5 && (chosen && strategy && optionResult && accounting ? <>
          <div className="eyebrow">{stock.name} · {direction === 'up' ? 'Sua previsão: Subida' : 'Sua previsão: Queda'} · {date(chosen.expiry)}</div>
          <h1>O que aconteceu de verdade?</h1>
          <p className="lead">O preço da ação veio do histórico: não foi sorteado nem definido pela sua escolha. O retorno da opção abaixo é uma reconstituição teórica pelo fechamento da ação no vencimento.</p>
          <div className="pulse-scenario-summary">
            <strong>Ação: {money(chosen.spotEntry)} em {date(chosen.entryDate)} → {money(chosen.spotExpiry)} em {date(chosen.expiry)}</strong>
            <span>O movimento histórico foi de {movement > 0 ? '+' : ''}{movement.toLocaleString('pt-BR')}%. Sua previsão de {direction === 'up' ? 'subida' : 'queda'} {outcome?.matchedDirection ? 'acertou a direção' : 'não acertou a direção'}.</span>
            <span>{accounting.optionNetResult > 0 ? 'A opção escolhida teve lucro teórico.' : accounting.optionNetResult < 0 ? 'A opção escolhida teve prejuízo teórico.' : 'A opção ficou em equilíbrio.'} Acertar o movimento da ação não garante lucro na opção.</span>
          </div>
          <div className="pulse-result-card">
            <small>VALOR FINAL HIPOTÉTICO · RECONSTITUIÇÃO HISTÓRICA</small>
            <strong>{money(totalWithFictionalFloor)}</strong>
            <span>Investimento inicial: {money(budget)}. Resultado líquido total: {accounting.totalNetResult > 0 ? '+' : ''}{money(accounting.totalNetResult)}. Este valor inclui eventual complemento fictício do XP Pulse, ainda sem financiamento real.</span>
          </div>
          <div className="pulse-panel pulse-result-table">
            <h2>De onde veio esse resultado?</h2>
            <p className="pulse-info-intro">A tabela separa a operação em opções da referência histórica de CDI e do complemento acadêmico.</p>
            <dl className="pulse-facts">
              <div><dt>Valor inicial investido</dt><dd>{money(budget)}</dd></div>
              <div><dt>Lucro ou prejuízo das opções <HelpBubble title="Lucro da opção">Calculamos o valor intrínseco teórico no vencimento menos o prêmio histórico pago por {strategy.position.contractSize.toLocaleString('pt-BR')} unidades. É uma conta ilustrativa antes de taxas, sem afirmar que a opção foi comprada ou exercida.</HelpBubble></dt><dd className={accounting.optionNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.optionNetResult > 0 ? '+' : ''}{money(accounting.optionNetResult)}</dd></div>
              <div><dt>Juros da renda fixa <HelpBubble title="Renda fixa">A sobra do orçamento rende hipoteticamente 100% do CDI diário histórico nos {chosen.cdiBusinessDays} dias úteis entre as datas, sem custos ou impostos.</HelpBubble></dt><dd>+{money(accounting.fixedIncomeNetResult)}</dd></div>
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
            <summary>Consultar contratos, preços e fontes</summary>
            <dl className="pulse-facts">
              <div><dt>Data do último prêmio observado</dt><dd>{date(chosen.entryDate)}</dd></div>
              <div><dt>Preço inicial histórico da ação</dt><dd>{money(chosen.spotEntry)}</dd></div>
              <div><dt>Preço final histórico da ação</dt><dd>{money(chosen.spotExpiry)}</dd></div>
              <div><dt>Série da opção</dt><dd>{strategy.original.ticker}</dd></div>
              <div><dt>Prêmio histórico por unidade</dt><dd>{money(strategy.original.premium)}</dd></div>
              <div><dt>Preço de exercício</dt><dd>{money(strategy.original.strike)}</dd></div>
              <div><dt>Valor intrínseco teórico das opções</dt><dd>{money(optionResult.value)}</dd></div>
              <div><dt>CDI acumulado no período</dt><dd>{(chosen.cdiRate*100).toFixed(4).replace('.',',')}%</dd></div>
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
          <h1>Entenda o efeito do preço</h1>
          <p className="lead">O ponto marcado mostra o fechamento histórico da ação em {date(chosen.expiry)}. As curvas explicam o lucro ou prejuízo teórico em outros preços, sem alterar o que ocorreu.</p>
          <div className="pulse-chart-figure">
            <span>Resultado econômico teórico das opções em {date(chosen.expiry)}</span>
            <strong className={accounting.optionNetResult < 0 ? 'pulse-negative' : 'pulse-positive'}>{accounting.optionNetResult > 0 ? '+' : ''}{money(accounting.optionNetResult)}</strong>
            <small>Preço histórico da ação no vencimento: {money(chosenPrice)}. Valor final do produto acadêmico com piso fictício: {money(totalWithFictionalFloor)}.</small>
          </div>
          <WhatIfChart stock={historicalStock} option={strategy.position} options={chartOptions} budget={budget} price={chosenPrice} onPrice={() => {}} onExpiry={() => {}} readOnly protection={{budget, cash: strategy.remaining, rate: chosen.cdiRate}}/>
          <p className="pulse-choice-note">Linha amarela: lucro ou prejuízo teórico das opções. Linha azul: resultado total hipotético do XP Pulse, com eventual complemento não financiado para o piso CDI. Custos e impostos não estão incluídos.</p>
          <button className="xp-primary" onClick={() => setStep(5)}>Voltar à tabela <ChevronRight size={18}/></button>
          <button className="pulse-secondary" type="button" onClick={() => { setStep(1); setHistoryId(''); }}>Simular outra empresa</button>
        </> : <div className="pulse-panel"><p>Não foi possível calcular essa operação histórica.</p><button className="xp-primary" onClick={() => setStep(3)}>Alterar período</button></div>)}
      </section>
    </div>
  </main>;
}
