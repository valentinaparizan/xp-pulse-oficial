import type { Option } from '../types/market';
// Official fixed-width layout (1-based positions translated to zero-based slices):
// https://b3.com.br/data/files/C8/F3/08/B4/297BE410F816C9E492D828A8/SeriesHistoricas_Layout.pdf
export function parseCotahist(text:string, tickers:string[], asOf:string, sourceUrl:string){
 const iso=(s:string)=>`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
 const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(!validDate(asOf))throw Error('Data de referência inválida');
 const lines=text.split(/\r?\n/).filter(Boolean);
 if(!lines[0]?.startsWith('00COTAHIST')||!lines.at(-1)?.startsWith('99COTAHIST'))throw Error('Arquivo COTAHIST incompleto');
 const count=Number(lines.at(-1)!.slice(31,42));
 // Daily file 02/10/2026 counts detail rows only; documented annual layout includes header/trailer.
 if(count!==lines.length&&count!==lines.length-2)throw Error('Contagem de registros inválida');
 const records=lines.filter(l=>l.startsWith('01')).map(l=>{
   if(l.length!==245)throw Error('Registro deve ter 245 posições');
   const num=(a:number,b:number)=>{const v=l.slice(a,b);if(!/^\d+$/.test(v))throw Error('Campo numérico inválido');return Number(v);};
   const date=iso(l.slice(2,10));if(!validDate(date)||date>asOf)throw Error('Data do pregão inválida ou futura');
   return {ticker:l.slice(12,24).trim(),market:l.slice(24,27),date,isin:l.slice(230,242),spec:l.slice(39,49).trim(),currency:l.slice(52,56).trim(),price:num(108,121)/100,strike:num(188,201)/100,expiry:iso(l.slice(202,210)),factor:num(210,217),trades:num(147,152),volume:num(170,188)/100,correction:l[201]};
 });
 const tradeDate=records.map(r=>r.date).sort().at(-1);if(!tradeDate)throw Error('Arquivo sem pregões');
 const spot=tickers.map(ticker=>records.filter(r=>r.ticker===ticker&&r.market==='010'&&r.date===tradeDate&&r.factor===1&&r.price>0).at(-1));
 if(spot.some(s=>!s))throw Error('Faltam preços das ações no mesmo pregão');
 const stocks=spot.map(s=>({ticker:s!.ticker,price:s!.price,sourceDate:tradeDate,sourceUrl,dataType:'b3_snapshot'}));
 const options:Option[]=[], seen=new Set<string>();let expired=0, unsupported=0, noPrice=0;
 for(const r of records){
   if(!['070','080'].includes(r.market)||r.date!==tradeDate)continue;
   // Exact underlying ISIN + share class, never a ticker-prefix inference (PETR3 != PETR4).
   const underlying=spot.find(s=>s!.isin===r.isin&&s!.spec.split(' ')[0]===r.spec.split(' ')[0]);if(!underlying)continue;
   if(!validDate(r.expiry)||r.expiry<=asOf){expired++;continue;}
   if(r.correction!=='0'||r.factor!==1||r.currency!=='R$'||r.strike<=0){unsupported++;continue;}
   if(r.trades<=0||r.price<=0){noPrice++;continue;}
   if(seen.has(r.ticker))throw Error(`Série duplicada: ${r.ticker}`);seen.add(r.ticker);
   options.push({ticker:r.ticker,underlying:underlying.ticker,type:r.market==='070'?'CALL':'PUT',strike:r.strike,premium:r.price,expiry:r.expiry,quoteFactor:r.factor,contractSize:100,style:'não informado no COTAHIST',sourceDate:r.date,sourceUrl,dataType:'b3_snapshot',premiumType:'historical',quantityType:'illustrative',specificationDate:r.date,trades:r.trades,volume:r.volume,underlyingIsin:r.isin});
 }
 if(!options.length)throw Error('Nenhuma opção elegível; base existente preservada');
 options.sort((a,b)=>a.underlying.localeCompare(b.underlying)||a.expiry.localeCompare(b.expiry)||a.type.localeCompare(b.type)||a.strike-b.strike||a.ticker.localeCompare(b.ticker));
 return {stocks,options,metadata:{tradeDate,asOf,sourceUrl,count:options.length,excluded:{expired,unsupported,noPrice},coverage:'Séries com negociação no pregão; não é o cadastro completo de séries autorizadas. Sem cotações em tempo real.'}};
}
