import { readFileSync } from 'node:fs';
const root = process.cwd();
const options = JSON.parse(readFileSync(root+'/src/data/options.json', 'utf8'));
const stocks = JSON.parse(readFileSync(root+'/src/data/stocks.json', 'utf8'));
const source = JSON.parse(readFileSync(root+'/src/data/b3-metadata.json', 'utf8'));
const today = Date.UTC(2026,10,16);
const money=(v)=>v.toFixed(2);
const round=(v)=>Math.round((v+Number.EPSILON)*100)/100;
const days=(iso)=>Math.round((Date.parse(iso+'T00:00:00Z')-today)/86400000);
const cost=(o)=>round(o.premium*o.contractSize/o.quoteFactor);
const valid=(o)=>['CALL','PUT'].includes(o.type)&&Number.isFinite(o.strike)&&o.strike>0&&Number.isFinite(o.premium)&&o.premium>0&&Number.isInteger(o.contractSize)&&o.contractSize>0&&Number.isFinite(o.quoteFactor)&&o.quoteFactor>0;
function best(series,budget,spot){
  const candidates=series.map(original=>{
    const unit=cost(original);if(unit<=0||unit>budget)return null;
    const lots=Math.floor((budget+0.0000001)/unit);
    if(lots<1)return null;
    const used=round(unit*lots);
    if(used>budget)return null;
    return {original,lots,units:original.contractSize*lots,used,remaining:round(budget-used)};
  }).filter(Boolean);
  candidates.sort((a,b)=>Math.abs((a.original.strike+(a.original.type==='CALL'?1:-1)*a.original.premium/a.original.quoteFactor)-spot)/spot-Math.abs((b.original.strike+(b.original.type==='CALL'?1:-1)*b.original.premium/b.original.quoteFactor)-spot)/spot || a.remaining-b.remaining || (b.original.trades||0)-(a.original.trades||0)||a.original.ticker.localeCompare(b.original.ticker));
  return candidates[0]||null;
}
function get(stock,budget,months){
  const all=options.filter(o=>valid(o)&&o.underlying===stock.ticker&&days(o.expiry)>0);
  const target=months*30.44,tol=Math.max(40,months*15);
  return [...new Set(all.map(o=>o.expiry))].map(expiry=>{
    const d=days(expiry);if(Math.abs(d-target)>tol)return null;
    const entries=all.filter(o=>o.expiry===expiry);
    const rise=best(entries.filter(o=>o.type==='CALL'),budget,stock.price);
    const fall=best(entries.filter(o=>o.type==='PUT'),budget,stock.price);
    if(!rise||!fall)return null;
    return {expiry,days:d,distance:Math.abs(d-target),rise,fall}
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance||(a.rise.remaining+a.fall.remaining)-(b.rise.remaining+b.fall.remaining)).slice(0,4);
}
function evaluate(stock,ch,final){
  const o=ch.original;
  const intrinsic=Math.max(o.type==='CALL'?final-o.strike:o.strike-final,0);
  const optionValue=round(intrinsic*ch.units);
  const net=round(optionValue-ch.used);
  const rate=Math.pow(1.012,days(o.expiry)/30)-1;
  const cash=round(ch.remaining*(1+rate));
  const before=round(optionValue+cash);
  const cdi=round((ch.used+ch.remaining)*(1+rate));
  const total=round(Math.max(before,cdi));
  return {net,before,cdi,total,additional:round(Math.max(0,cdi-before)),cash};
}
const invalid=options.filter(o=>!valid(o)).length;
const future=options.filter(o=>days(o.expiry)>0).length;
const out=[];
for(const stock of stocks){
  for(const budget of [20,50,100,200]){
    for(const months of [1,3,6]){
      const opp=get(stock,budget,months);
      if(opp.length===0){out.push({stock:stock.ticker,budget,months,available:0});continue;}
      for(let idx=0;idx<Math.min(opp.length,2);idx++){
        const item=opp[idx],c=item.rise;
        const target=round(stock.price*1.1),e=evaluate(stock,c,target);
        out.push({stock:stock.ticker,budget,months,rank:idx+1,expiry:item.expiry,days:item.days,
          code:c.original.ticker, strike:c.original.strike, premium:c.original.premium, quoteFactor:c.original.quoteFactor,
          units:c.units,used:c.used,cash:c.remaining,spot:stock.price,
          breakEven:round(c.original.strike+c.original.premium/c.original.quoteFactor),
          atPlus10:{stockPrice:target,...e},
          atPlus20:evaluate(stock,c,round(stock.price*1.2)),
          atPlus30:evaluate(stock,c,round(stock.price*1.3))});
      }
    }
  }
}
const positives=out.filter(x=>x.atPlus10?.net>0).sort((a,b)=>a.budget-b.budget||a.months-b.months||a.stock.localeCompare(b.stock));
const positiveBy20=out.filter(x=>x.atPlus20?.net>0).sort((a,b)=>a.budget-b.budget||a.months-b.months||a.stock.localeCompare(b.stock));
const highStrike=out.filter(x=>x.breakEven > x.spot*2);
const noRiseBy30=out.filter(x=>x.atPlus30&&x.atPlus30.net<=0);
console.log('AUDIT META',JSON.stringify({metadata:source,count:options.length,invalid,future,expired:options.length-future,stocks:stocks.map(s=>({ticker:s.ticker,price:s.price}))}));
console.log('AUDIT FINDINGS',JSON.stringify({combinations:out.length,withoutOpportunity:out.filter(x=>x.available===0).length,positiveAt10:positives.length,positiveAt20:positiveBy20.length,noRiseAt30:noRiseBy30.length,unreachableWithinChart:highStrike.length}));
console.log('AUDIT BEST POSITIVE at +10%',JSON.stringify(positives.slice(0,15)));
console.log('AUDIT BEST POSITIVE at +20%',JSON.stringify(positiveBy20.slice(0,12)));
console.log('AUDIT PETROBRAS 100 1month',JSON.stringify(out.filter(x=>x.stock==='PETR4'&&x.budget===100&&x.months===1)));
console.log('AUDIT PETROBRAS 200 1month',JSON.stringify(out.filter(x=>x.stock==='PETR4'&&x.budget===200&&x.months===1)));
console.log('AUDIT UNREACHABLE GRAPH',JSON.stringify(highStrike.slice(0,12)));
console.log('AUDIT NO GAIN +30%',JSON.stringify(noRiseBy30.slice(0,10)));
