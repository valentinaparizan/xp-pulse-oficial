import { useState } from 'react';
import type { Stock, Option } from '../types/market';
import { selectOptions } from '../utils/optionFilters';
import { money, date } from '../utils/format';
import { optionCost, payoff, breakEven } from '../utils/optionsMath';

export function BudgetEconomics(){return <details className="simple-details"><summary>Por que o valor limita minhas escolhas?</summary>
 <p>Você não paga pelo prazo: paga pelo <b>direito de comprar ou vender a ação</b>. O preço desse direito é o <b>prêmio</b>. Cada opção tem um preço, um strike e uma data de vencimento.</p>
 <p><b>Exemplo ilustrativo:</b> prêmio de R$ 1,20 por unidade × 100 unidades = R$ 120. Com limite de R$ 100, faltam R$ 20. Por isso essa opção fica desabilitada — não porque o mercado proíba investir R$ 100.</p>
 <p>Um prazo maior dá mais tempo para a ação se movimentar e pode tornar o direito mais caro. Mas prazo não explica tudo: preço da ação, strike, oscilações esperadas, juros e condições de negociação também influenciam o prêmio. Não existe uma regra de que toda data mais distante custe mais.</p>
 <p><b>Regra deste protótipo:</b> usamos uma posição fixa de 100 unidades didáticas e apenas as séries desta base. Se nenhuma couber, bloqueamos a escolha. Isso não representa todo o mercado nem um lote mínimo oficial.</p>
 <p>CALL e PUT são direitos diferentes, com preços diferentes. Um mesmo valor pode cobrir uma direção, mas não a outra. Mais orçamento pode liberar outra série; mais prazo não garante que a ação chegue ao preço necessário.</p>
 <a href="https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/opcoes-sobre-acoes.htm" target="_blank" rel="noreferrer">Especificações de opções na B3</a>
 </details>}

export function BudgetExplorer({stock,options,budget,expiry,onApply}:{stock:Stock;options:Option[];budget:number;expiry:string;onApply:(budget:number,expiry:string)=>void}){
 const starting=Number.isFinite(budget)&&budget>0&&budget<=1000000?budget:50;
 const [amount,setAmount]=useState(starting),[term,setTerm]=useState(expiry),[direction,setDirection]=useState<'CALL'|'PUT'>('CALL');
 const dates=[...new Set(options.filter(o=>o.underlying===stock.ticker).map(o=>o.expiry))].sort();
 const chosenDate=dates.includes(term)?term:dates[0];
 const base=selectOptions(options,stock.ticker,direction,chosenDate,amount,stock.price);
 const chosen=base.affordable[0];
 const amounts=[...new Set([Math.max(.01,Math.round(starting*50)/100),starting,Math.min(1000000,Math.round(starting*200)/100)])];
 return <details className="simple-details budget-explorer"><summary>E se eu usasse mais ou menos dinheiro?</summary>
 <p>Compare sem mudar sua escolha. Teste um limite e uma data; só aplicamos quando você confirmar abaixo.</p>
 <fieldset><legend>Limite para comparar</legend><div className="simple-presets">{amounts.map(a=><button key={a} aria-pressed={a===amount} onClick={()=>setAmount(a)}>{money(a)}<small>{a<starting?'Menos':a>starting?'Mais':'Seu valor'}</small></button>)}</div></fieldset>
 <label className="expiry-choice">Data do cenário<select value={chosenDate} onChange={e=>setTerm(e.target.value)}>{dates.map(d=><option key={d} value={d}>{date(d)}</option>)}</select></label>
 <fieldset><legend>Ideia que quer comparar</legend><div className="simple-presets"><button aria-pressed={direction==='CALL'} onClick={()=>setDirection('CALL')}>Acho que sobe</button><button aria-pressed={direction==='PUT'} onClick={()=>setDirection('PUT')}>Acho que cai</button></div></fieldset>
 <div aria-live="polite" aria-atomic="true" className="comparison-summary">
 <h3>Com {money(amount)}, até {date(chosenDate)}</h3>
 {!chosen?<p>{base.minimum===null?'Não há série desta direção e data na base. Isso não significa que ela não exista no mercado.':`Ainda não cabe: a opção mais barata custa ${money(base.minimum)}. Faltam ${money(base.minimum-amount)}.`}</p>:<>
 <p><b>{base.affordable.length} opção(ões) cabe(m).</b> Exemplo selecionado: {chosen.ticker}, com strike de {money(chosen.strike)}.</p>
 <dl className="result-details"><div><dt>Valor usado</dt><dd>{money(optionCost(chosen))}</dd></div><div><dt>Fica sem usar</dt><dd>{money(amount-optionCost(chosen))}</dd></div><div><dt>Perda máxima do prêmio</dt><dd>{money(optionCost(chosen))}</dd></div></dl>
 <h3>Se a ação terminasse nessa data…</h3>
 <ul className="comparison-results">{[-10,0,10].map(change=>{const price=Math.round(stock.price*(1+change/100)*100)/100;const r=payoff(chosen,price).result;return <li key={change}><span>{change<0?'Caindo 10%':change>0?'Subindo 10%':'No mesmo preço'}<small>Ação a {money(price)}</small></span><b>{r<0?'Perda':r>0?'Lucro':'Equilíbrio'}<small>{money(Math.abs(r))}</small></b></li>})}</ul>
 <p>Para lucrar, a ação precisa terminar {direction==='CALL'?'acima':'abaixo'} de {money(breakEven(chosen))}.</p>
 <p className="disclaimer">Prêmio {chosen.premiumType==='illustrative'?'ilustrativo':'histórico'} de {date(chosen.sourceDate)}. Cenários hipotéticos antes de taxas e tributos. Não são previsões nem dinheiro recebido. <a href={chosen.sourceUrl} target="_blank" rel="noreferrer">Fonte da série</a>.</p>
 </>}
 </div>
 <p><b>Mais dinheiro não multiplica o resultado aqui.</b> Mantemos 100 unidades. Se a série escolhida continuar igual, o resultado também fica igual e só aumenta a sobra. Se outra série passar a caber, strike, custo e resultado podem mudar.</p>
 <p className="disclaimer">Cada prazo pode selecionar outra série e outro strike: esta comparação não isola o efeito do tempo. Usamos os últimos negócios do mesmo pregão, que podem ter ocorrido em horários diferentes. Só há as datas desta base; não calculamos venda antecipada.</p>
 <button className="secondary-button" disabled={!chosen} onClick={()=>onApply(amount,chosenDate)}>Usar este valor e prazo</button><small>A direção será escolhida na próxima etapa. Nenhuma aplicação real é feita.</small>
 </details>;
}
