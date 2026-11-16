import { useId } from 'react';
import type { Option, Stock } from '../types/market';
import { payoff, breakEven, optionCost } from '../utils/optionsMath';
import { selectOptions, availableExpiries } from '../utils/optionFilters';
import { money, date } from '../utils/format';
import { pulseAccounting } from '../utils/pulseAccounting';

export function WhatIfChart({stock,option,options,budget,price,onPrice,onExpiry,protection}:{stock:Stock;option:Option;options:Option[];budget:number;price:number;onPrice:(price:number)=>void;onExpiry:(expiry:string)=>void;protection?:{budget:number;cash:number;rate:number}}){
 const id=useId();
 const equilibrium=breakEven(option), cost=optionCost(option);
 // Keep user-entered final prices and break-even levels inside the chart range.
 const maximum=Math.round(Math.max(stock.price*2, price*1.15, option.strike*1.05, equilibrium*1.05)*100)/100;
 const points=[...new Set([0,maximum,option.strike,equilibrium].filter(v=>v>=0&&v<=maximum))].sort((a,b)=>a-b);
 const protectedGain=(p:number)=>protection?pulseAccounting({principal:protection.budget,optionAmount:cost,optionValueAtMaturity:payoff(option,p).value,fixedIncomeAmount:protection.cash,simulatedRate:protection.rate}).totalNetResult:null;
 const results=points.map(p=>payoff(option,p).result);
 const protectedResults=protection?points.map(p=>protectedGain(p)!):[];
 const allResults=[...results,...protectedResults];
 const low=Math.min(-cost,...allResults),high=Math.max(0,...allResults),spread=Math.max(high-low,1);
 const x=(p:number)=>64+p/maximum*440, y=(v:number)=>28+(high-v)/spread*172;
 const current=payoff(option,price).result,protectedCurrent=protectedGain(price);
 const dates=availableExpiries(options,stock.ticker,option.type);
 return <section className="what-if" aria-label="Gráfico E se o preço mudasse">
 <h2>E se… o preço fosse diferente?</h2><p>Arraste o preço. O gráfico mostra a opção no vencimento, sem prever o mercado.</p>{protection&&<p><b>Linha amarela:</b> lucro ou prejuízo da opção isolada. <b>Linha azul:</b> resultado do XP Pulse com o piso fictício de CDI e a parcela em renda fixa.</p>}
 {dates.length>1&&<><label htmlFor={`${id}-date`}>Em qual prazo?</label><select id={`${id}-date`} value={option.expiry} onChange={e=>onExpiry(e.target.value)}>{dates.map(d=>{const s=selectOptions(options,stock.ticker,option.type,d,budget,stock.price);return <option key={d} value={d} disabled={!s.affordable.length}>{date(d)}{!s.affordable.length?` · precisa de ${money(s.minimum!)}`:''}</option>})}</select></>}
 <p className="disclaimer">{dates.length===1?'Data escolhida em Suas oportunidades.':'Ao trocar a data, outra série pode ser selecionada; strike e custo também podem mudar.'}</p>
 <svg viewBox="0 0 540 245" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
 <title id={`${id}-title`}>Resultado da compra de {option.type} em {date(option.expiry)}</title>
 <desc id={`${id}-desc`}>Preço da ação no eixo horizontal, resultado em reais no vertical. Com ação a {money(price)}, resultado de {money(current)}. Equilíbrio em {money(equilibrium)}. Faixa de preços de zero a {money(maximum)}, não uma previsão.</desc>
 <rect x="64" y="28" width="440" height={Math.max(0,y(0)-28)} fill="#173b2b"/>
 <rect x="64" y={y(0)} width="440" height={Math.max(0,200-y(0))} fill="#442327"/>
 <line x1="64" x2="504" y1={y(0)} y2={y(0)} stroke="#b1babf" strokeDasharray="4 4"/>
 <text x="60" y="20" fill="#b8c3c9" fontSize="12">Resultado (R$)</text>
 <text x="59" y="39" textAnchor="end" fill="#b8c3c9" fontSize="11">{Math.round(high)}</text>
 <text x="59" y="204" textAnchor="end" fill="#b8c3c9" fontSize="11">{Math.round(low)}</text>
 <text x="510" y={y(0)+4} fill="#b8c3c9" fontSize="11">0</text>
 <polyline points={points.map(p=>`${x(p)},${y(payoff(option,p).result)}`).join(' ')} fill="none" stroke="#ffe04a" strokeWidth="3"/>
 {protection&&<polyline points={points.map(p=>`${x(p)},${y(protectedGain(p)!)}`).join(' ')} fill="none" stroke="#9bdce5" strokeWidth="3"/>}
 {equilibrium>=0&&equilibrium<=maximum&&<circle cx={x(equilibrium)} cy={y(0)} r="4" fill="white"/>}
 <line x1={x(price)} x2={x(price)} y1="28" y2="200" stroke="#ffffff60"/>
 <circle cx={x(price)} cy={y(current)} r="6" fill="#ffe04a" stroke="#0a1115" strokeWidth="2"/>
 {protection&&protectedCurrent!==null&&<circle cx={x(price)} cy={y(protectedCurrent)} r="6" fill="#9bdce5" stroke="#0a1115" strokeWidth="2"/>}
 <text x="64" y="220" fill="#b8c3c9" fontSize="12">R$ 0</text><text x="504" y="220" textAnchor="end" fill="#b8c3c9" fontSize="12">{money(maximum)}</text>
 <text x="284" y="240" textAnchor="middle" fill="#b8c3c9" fontSize="12">Preço da ação no vencimento</text>
 </svg>
 <label htmlFor={`${id}-price`}>Preço da ação: <b>{money(price)}</b></label><input id={`${id}-price`} type="range" min="0" max={maximum} step="0.01" value={price} onChange={e=>onPrice(Number(e.target.value))} aria-valuetext={`${money(price)}; ${current<0?'prejuízo':'resultado'} de ${money(Math.abs(current))}`}/>
 <p className="chart-result" role="status" aria-live="polite">Opção isolada: <b>{money(current)}</b>{protection&&protectedCurrent!==null&&<> · XP Pulse fictício: <b>{money(protectedCurrent)}</b></>}</p>
 <div className="simple-presets"><button onClick={()=>onPrice(option.type==='CALL'?0:maximum)}>Ver maior perda</button>{equilibrium>=0&&equilibrium<=maximum&&<button onClick={()=>onPrice(equilibrium)}>Ver equilíbrio</button>}<button onClick={()=>onPrice(option.type==='CALL'?maximum:0)}>Ver maior ganho da faixa</button></div>
 <p className="disclaimer">Perda máxima do prêmio: {money(cost)}. O maior ganho mostrado vale apenas para este intervalo do gráfico, não é uma promessa ou limite geral de lucro. Valores antes de taxas e tributos; não representam venda antecipada.</p>
 </section>;
}
