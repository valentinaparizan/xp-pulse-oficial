import { useId } from 'react';
import type { Option, Stock } from '../types/market';
import { payoff, breakEven, optionCost } from '../utils/optionsMath';
import { selectOptions, availableExpiries } from '../utils/optionFilters';
import { money, date } from '../utils/format';

export function WhatIfChart({stock,option,options,budget,price,onPrice,onExpiry}:{stock:Stock;option:Option;options:Option[];budget:number;price:number;onPrice:(price:number)=>void;onExpiry:(expiry:string)=>void}){
 const id=useId(), maximum=Math.round(stock.price*200)/100;
 const equilibrium=breakEven(option), cost=optionCost(option);
 const points=[...new Set([0,maximum,option.strike,equilibrium].filter(v=>v>=0&&v<=maximum))].sort((a,b)=>a-b);
 const results=points.map(p=>payoff(option,p).result);
 const low=Math.min(-cost,...results),high=Math.max(0,...results),spread=Math.max(high-low,1);
 const x=(p:number)=>64+p/maximum*440, y=(v:number)=>28+(high-v)/spread*172;
 const current=payoff(option,price).result;
 const dates=availableExpiries(options,stock.ticker,option.type);
 return <section className="what-if" aria-label="Gráfico E se o preço mudasse">
 <h2>E se… o preço fosse diferente?</h2><p>Arraste o preço. O ponto mostra qual seria o resultado da sua estratégia <b>no vencimento</b>.</p>
 <label htmlFor={`${id}-date`}>Em qual prazo?</label><select id={`${id}-date`} value={option.expiry} onChange={e=>onExpiry(e.target.value)}>{dates.map(d=>{const s=selectOptions(options,stock.ticker,option.type,d,budget,stock.price);return <option key={d} value={d} disabled={!s.affordable.length}>{date(d)}{!s.affordable.length?` · precisa de ${money(s.minimum!)}`:''}</option>})}</select>
 <p className="disclaimer">{dates.length===1?'Só há um prazo desta direção na base. ':''}Ao trocar a data, outra série pode ser selecionada; strike e custo também podem mudar. Não isolamos o efeito do tempo.</p>
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
 {equilibrium>=0&&equilibrium<=maximum&&<circle cx={x(equilibrium)} cy={y(0)} r="4" fill="white"/>}
 <line x1={x(price)} x2={x(price)} y1="28" y2="200" stroke="#ffffff60"/>
 <circle cx={x(price)} cy={y(current)} r="6" fill="white" stroke="#0a1115" strokeWidth="2"/>
 <text x="64" y="220" fill="#b8c3c9" fontSize="12">R$ 0</text><text x="504" y="220" textAnchor="end" fill="#b8c3c9" fontSize="12">{money(maximum)}</text>
 <text x="284" y="240" textAnchor="middle" fill="#b8c3c9" fontSize="12">Preço da ação no vencimento</text>
 </svg>
 <label htmlFor={`${id}-price`}>Preço da ação: <b>{money(price)}</b></label><input id={`${id}-price`} type="range" min="0" max={maximum} step="0.01" value={price} onChange={e=>onPrice(Number(e.target.value))} aria-valuetext={`${money(price)}; ${current<0?'prejuízo':'resultado'} de ${money(Math.abs(current))}`}/>
 <p className="chart-result" role="status" aria-live="polite">Resultado simulado: <b>{money(current)}</b></p>
 <div className="simple-presets"><button onClick={()=>onPrice(option.type==='CALL'?0:maximum)}>Ver maior perda</button>{equilibrium>=0&&equilibrium<=maximum&&<button onClick={()=>onPrice(equilibrium)}>Ver equilíbrio</button>}<button onClick={()=>onPrice(option.type==='CALL'?maximum:0)}>Ver maior ganho da faixa</button></div>
 <p className="disclaimer">Perda máxima do prêmio: {money(cost)}. O maior ganho mostrado vale apenas para este intervalo do gráfico, não é uma promessa ou limite geral de lucro. Valores antes de taxas e tributos; não representam venda antecipada.</p>
 </section>;
}
