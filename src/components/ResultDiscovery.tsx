import type { Option } from '../types/market';
import { payoff, breakEven } from '../utils/optionsMath';
import { money, date } from '../utils/format';

export function ResultExplanation({option:o,price}:{option:Option;price:number}) {
  const p=payoff(o,price), be=breakEven(o);
  const status=p.result>0?'gain':p.result<0?'loss':'neutral';
  const why=p.value===0
    ? `A ação terminou ${o.type==='CALL'?'no strike ou abaixo dele':'no strike ou acima dele'}. O direito não tem valor intrínseco nesse preço; você perde o prêmio pago.`
    : p.result<0 ? 'O direito tem valor, mas esse valor ainda é menor que o prêmio que você pagou. Você recupera parte do custo e perde a diferença.'
    : p.result===0 ? 'O valor do direito cobre exatamente o prêmio pago. Você recupera o custo, sem lucro antes de taxas e tributos.'
    : 'O valor do direito supera o prêmio pago. Depois de descontar esse custo, a diferença é seu lucro simulado.';
  return <section className="discovery" aria-label="Entenda seu resultado">
    <div className={`result-card ${status}`} role="status" aria-live="polite" aria-atomic="true">
      <span>RESULTADO HIPOTÉTICO · {date(o.expiry)}</span><p>{o.type} · strike {money(o.strike)} · ação a {money(price)}</p>
      <h2>{p.result>0?'Você teria lucro':p.result<0?'Você teria prejuízo':'Você ficaria no zero a zero'}</h2>
      <b>{money(Math.abs(p.result))}</b>
      <p>{p.result<0?'Perda':p.result>0?'Ganho':'Resultado'} após descontar o prêmio. Nenhum dinheiro real foi ganho ou perdido.</p>
    </div>
    <div className="translation-card"><h2>Como chegamos a esse valor?</h2><dl className="result-details">
      <div><dt>1. Custo inicial da opção</dt><dd>{money(p.cost)}</dd></div>
      <div><dt>2. Valor intrínseco da posição no vencimento</dt><dd>{money(p.value)}</dd></div>
      <div><dt>3. Valor menos custo</dt><dd>{money(p.value)} − {money(p.cost)} = <strong>{money(p.result)}</strong></dd></div>
    </dl><h3>Por que isso aconteceu?</h3><p>{why}</p><p>Ação no cenário: <b>{money(price)}</b>. Strike: <b>{money(o.strike)}</b>. Para ter lucro no vencimento, o preço precisa ficar <b>{o.type==='CALL'?'acima':'abaixo'} de {money(be)}</b>, não basta apenas {o.type==='CALL'?'subir':'cair'}.</p>
    <details><summary>Ver a conta por unidade</summary><p>{o.type==='CALL'?`${money(price)} − ${money(o.strike)}`:`${money(o.strike)} − ${money(price)}`}, com mínimo de zero, dá {money(p.intrinsic)} por unidade. Multiplicamos pela quantidade didática de {o.contractSize} unidades e descontamos {money(p.cost)} de prêmio total. O prêmio por unidade é {money(o.premium/o.quoteFactor)}.</p></details>
    <p className="disclaimer">Resultado econômico simplificado no vencimento, antes de taxas e tributos. Não é uma venda executada nem dinheiro creditado: o exercício pode envolver ações e recursos adicionais. Não calcula saída antecipada.</p></div>
  </section>;
}

export function PriceRanges({option:o,price,onChange}:{option:Option;price:number;onChange:(price:number)=>void}) {
 const be=breakEven(o), call=o.type==='CALL';
 const rows=[
   {name:'Perda de todo o prêmio',range:call?`Até ${money(o.strike)}`:`A partir de ${money(o.strike)}`,value:o.strike},
   {name:'Perda de parte do prêmio',range:`Entre ${money(Math.min(o.strike,be))} e ${money(Math.max(o.strike,be))} (sem os limites)`,value:Math.round((o.strike+be)/2*100)/100},
   {name:'Zero a zero',range:`Exatamente ${money(be)}`,value:be},
   {name:'Lucro',range:call?`Acima de ${money(be)}`:`Abaixo de ${money(be)}`,value:Math.max(0,Math.round((be+(call?1:-1)*Math.max(1,o.premium/o.quoteFactor))*100)/100)}
 ];
 return <section className="translation-card"><h2>Em qual faixa está seu resultado?</h2><p>Faixas do preço da <b>ação em {date(o.expiry)}</b>. Não são probabilidades. Toque para experimentar.</p><div className="range-list">{rows.map(r=><button key={r.name} onClick={()=>{onChange(r.value);document.querySelector('[aria-label="Entenda seu resultado"]')?.scrollIntoView({behavior:'smooth',block:'start'});}} aria-pressed={price===r.value}><b>{r.name}</b><span>{r.range}</span><small>Testar ação a {money(r.value)}</small></button>)}</div><p>O strike é onde o direito começa a ter valor intrínseco. O ponto de equilíbrio é onde esse valor já pagou o prêmio. São duas fronteiras diferentes.</p></section>;
}

export function OptionGuide(){return <details className="translation-card option-guide"><summary>CALL, PUT, strike… traduzir os nomes</summary><dl>
 <dt>Opção</dt><dd>Contrato que dá ao comprador um direito sobre uma ação. Não é a própria ação.</dd>
 <dt>CALL · opção de compra</dt><dd>Direito de comprar pelo strike, conforme as regras do contrato. Nesta compra isolada, uma alta suficiente pode gerar lucro.</dd>
 <dt>PUT · opção de venda</dt><dd>Direito de vender pelo strike. Comprar PUT não é vender uma opção: você paga pelo direito e uma queda suficiente pode gerar lucro.</dd>
 <dt>Strike · preço de exercício</dt><dd>Preço de referência do contrato, não o preço pago pela opção e nem o ponto de lucro.</dd>
 <dt>Prêmio</dt><dd>Preço pago pelo direito. Não é um bônus. Precisa ser recuperado antes de existir lucro.</dd>
 <dt>Vencimento</dt><dd>Data em que o contrato expira. Um movimento depois dela não muda o resultado daquela opção.</dd>
 <dt>Break-even · ponto de equilíbrio</dt><dd>No vencimento: strike + prêmio por unidade para CALL; strike − prêmio por unidade para PUT. Resultado zero antes de custos.</dd>
 <dt>Dentro, no ou fora do dinheiro · ITM, ATM, OTM</dt><dd>Comparam ação e strike, não seu lucro. CALL dentro do dinheiro: ação acima do strike. PUT: ação abaixo. No dinheiro: preços iguais; fora: lado oposto. Estar dentro não garante recuperar o prêmio.</dd>
 <dt>Série · código da opção</dt><dd>Identifica um contrato específico, com tipo, strike e vencimento. Não leia os números do código como se fossem necessariamente o strike: confira os dados da série.</dd>
 </dl><a href="https://b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/opcoes-sobre-acoes.htm" target="_blank" rel="noreferrer">Consultar especificações na B3</a></details>}

export function TermStrikeGuide(){return <details className="translation-card"><summary>Como prazo e strike trabalham juntos?</summary><p><b>Strike responde “qual preço?”. Prazo responde “em qual data?”.</b> Cada combinação é uma série diferente e tem seu próprio prêmio.</p><p>Na CALL, um strike mais alto exige preço final mais alto para o direito ter valor. Na PUT, um strike mais baixo exige uma queda maior. O lucro ainda depende de descontar o prêmio de cada série.</p><p>Mais prazo dá mais tempo para o movimento, mas não garante lucro e pode custar mais. Antes do vencimento, tempo e volatilidade também afetam o preço da opção.</p><p><b>Exemplo inteiramente ilustrativo:</b> CALL com strike de R$ 50 e prêmio de R$ 2 por unidade: se a ação terminar em R$ 51, o direito vale R$ 1 e a perda é R$ 1 por unidade. Em R$ 52 há equilíbrio; acima disso há lucro antes de custos. Chegar a R$ 53 somente depois do vencimento não ajuda esse contrato.</p><p>O simulador compara preços finais na data escolhida. Ele não prevê a trajetória da ação nem calcula como o prêmio muda dia a dia. Ao trocar o vencimento, compare novamente strike, prêmio e equilíbrio.</p></details>}
