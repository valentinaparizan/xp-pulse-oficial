import type { Option } from '../types/market';
import { selectOptions, availableExpiries } from '../utils/optionFilters';
import { money, date } from '../utils/format';

export function DirectionAvailability({direction,minimum,expiry,budget,ticker,options,onAdjust,onDate}:{direction:'up'|'down';minimum:number|null;expiry:string;budget:number;ticker:string;options:Option[];onAdjust:()=>void;onDate:(expiry:string)=>void}){
 const type=direction==='up'?'CALL':'PUT', title=direction==='up'?'Acho que sobe':'Acho que cai';
 const alternatives=availableExpiries(options,ticker,type).filter(d=>d!==expiry).map(d=>({date:d,...selectOptions(options,ticker,type,d,budget,0)}));
 return <aside id={`unavailable-${direction}`} className="direction-explanation" aria-label={`Por que ${title} está indisponível?`}>
 <h3>Por que “{title}” está indisponível?</h3>
 <p>Para simular {direction==='up'?'alta':'queda'}, usamos uma <b>{type}</b> ({direction==='up'?'opção de compra':'opção de venda'}).</p>
 {minimum===null?<><p><b>Não temos uma {type} de {ticker} com vencimento em {date(expiry)} nesta base.</b> Aumentar o valor não resolve a ausência dessa série.</p><p>Isso não quer dizer que a ação não possa {direction==='up'?'subir':'cair'}, nem que essa opção não exista no mercado. É um limite dos dados do protótipo.</p></>:<><p><b>A {type} mais barata nesta data custa {money(minimum)}.</b> Seu limite é {money(budget)}: faltam {money(Math.max(0,minimum-budget))}.</p><p>Esse custo é o prêmio por unidade × a quantidade didática. Não é uma taxa para escolher {direction==='up'?'alta':'queda'}. Mantivemos seu valor, sem aumentá-lo automaticamente.</p></>}
 {alternatives.length>0&&<><h4>Outros prazos desta direção</h4>{alternatives.map(a=><div className="direction-alternative" key={a.date}><p><b>{date(a.date)}</b> · a partir de {money(a.minimum!)}<br/>{a.affordable.length?'Cabe no seu valor atual.':`Ainda faltam ${money(Math.max(0,a.minimum!-budget))} para o menor custo.`}</p>{a.affordable.length>0&&<button className="secondary-button" onClick={()=>onDate(a.date)}>Usar {date(a.date)} e manter {money(budget)}</button>}</div>)}</>}
 <button className="inline-action" onClick={onAdjust}>Revisar valor e prazo</button>
 </aside>;
}
